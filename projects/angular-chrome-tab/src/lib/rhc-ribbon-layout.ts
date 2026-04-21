import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  TemplateRef,
  ViewChild,
  computed,
  effect,
  input,
  output,
  signal,
} from '@angular/core';

const TAB_CONTENT_MARGIN = 9;
const TAB_CONTENT_OVERLAP_DISTANCE = 1;
const TAB_OVERLAP_DISTANCE = TAB_CONTENT_MARGIN * 2 + TAB_CONTENT_OVERLAP_DISTANCE;
const TAB_MIN_WIDTH = 96;
const TAB_CONTENT_MIN_WIDTH = TAB_MIN_WIDTH - TAB_OVERLAP_DISTANCE;
const TAB_TITLE_FONT =
  '500 13px "SF Pro SC","SF Pro Display","SF Pro Icons","PingFang SC","微软雅黑","Microsoft YaHei","Helvetica Neue","Helvetica","Arial",sans-serif';
const TAB_HORIZONTAL_PADDING = 24;
const TAB_TITLE_WIDTH_BUFFER = 6;
const TAB_FAVICON_WIDTH = 16;
const TAB_FAVICON_GAP = 8;
const TAB_FAVICON_OFFSET = 4;
const TAB_CLOSE_BUTTON_WIDTH = 16;
const TAB_CLOSE_BUTTON_GAP = 8;
const TAB_SIZE_SMALL = TAB_CONTENT_MIN_WIDTH + 1;
const TAB_SIZE_SMALLER = 60;
const TAB_SIZE_MINI = 48;
const MAX_OVERSCROLL = 72;
const DRAG_OVERSCROLL_RESISTANCE = 0.32;
const FLING_OVERSCROLL_RESISTANCE = 0.22;

export interface RHCRibbonTabItem {
  id: string;
  title: string;
  favicon?: string | null;
  showCloseButton?: boolean;
}

export type RHCRibbonTabTheme = 'light' | 'dark';
export type RHCRibbonLayoutEventType = 'create' | 'remove' | 'select';
export type RHCRibbonLayoutEventOrigin = 'api' | 'ui';
export type RHCRibbonLayoutEventListenerType = RHCRibbonLayoutEventType | '*';

export interface RHCRibbonLayoutTabContentContext<TContext = unknown> {
  $implicit: TContext;
  tab: RHCRibbonLayoutTab<TContext> | null;
  active: boolean;
}

export interface RHCRibbonLayoutEventBase<TContext = unknown> {
  origin: RHCRibbonLayoutEventOrigin;
  tabs: RHCRibbonLayoutTab<TContext>[];
  timestamp: number;
}

export interface RHCRibbonLayoutCreateEvent<TContext = unknown>
  extends RHCRibbonLayoutEventBase<TContext> {
  type: 'create';
  tab: RHCRibbonLayoutTab<TContext>;
  index: number;
  activated: boolean;
}

export interface RHCRibbonLayoutRemoveEvent<TContext = unknown>
  extends RHCRibbonLayoutEventBase<TContext> {
  type: 'remove';
  tab: RHCRibbonLayoutTab<TContext>;
  index: number;
  nextActiveTabId: string | null;
}

export interface RHCRibbonLayoutSelectEvent<TContext = unknown>
  extends RHCRibbonLayoutEventBase<TContext> {
  type: 'select';
  tab: RHCRibbonLayoutTab<TContext> | null;
  index: number;
  previousTab: RHCRibbonLayoutTab<TContext> | null;
  previousIndex: number;
}

export type RHCRibbonLayoutEvent<TContext = unknown> =
  | RHCRibbonLayoutCreateEvent<TContext>
  | RHCRibbonLayoutRemoveEvent<TContext>
  | RHCRibbonLayoutSelectEvent<TContext>;

export type RHCRibbonLayoutEventListener<TContext = unknown> = (
  event: RHCRibbonLayoutEvent<TContext>,
) => void;

export class RHCRibbonLayoutTab<TContext = unknown> implements RHCRibbonTabItem {
  id: string;
  title: string;
  favicon?: string | null;
  showCloseButton: boolean;
  contentTemplate: TemplateRef<RHCRibbonLayoutTabContentContext<TContext>> | null;
  contentContext: TContext | null;
  contentContainerClass?: string;

  constructor(config: {
    id: string;
    title: string;
    favicon?: string | null;
    showCloseButton?: boolean;
    contentTemplate?: TemplateRef<RHCRibbonLayoutTabContentContext<TContext>> | null;
    contentContext?: TContext | null;
    contentContainerClass?: string;
  }) {
    this.id = config.id;
    this.title = config.title;
    this.favicon = config.favicon ?? null;
    this.showCloseButton = config.showCloseButton ?? false;
    this.contentTemplate = config.contentTemplate ?? null;
    this.contentContext = config.contentContext ?? null;
    this.contentContainerClass = config.contentContainerClass;
  }
}

interface RHCRibbonRenderedTab extends RHCRibbonLayoutTab {
  width: number;
  position: number;
  active: boolean;
  hideFavicon: boolean;
  isSmall: boolean;
  isSmaller: boolean;
  isMini: boolean;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

let tabTitleMeasureContext: CanvasRenderingContext2D | null = null;

function getTabTitleMeasureContext(): CanvasRenderingContext2D | null {
  if (tabTitleMeasureContext) {
    return tabTitleMeasureContext;
  }

  if (typeof document === 'undefined') {
    return null;
  }

  const canvas = document.createElement('canvas');
  tabTitleMeasureContext = canvas.getContext('2d');

  if (tabTitleMeasureContext) {
    tabTitleMeasureContext.font = TAB_TITLE_FONT;
  }

  return tabTitleMeasureContext;
}

function measureTabTitleWidth(title: string): number {
  const context = getTabTitleMeasureContext();
  if (!context) {
    return title.length * 7;
  }

  context.font = TAB_TITLE_FONT;
  return context.measureText(title).width;
}

function applyOverscrollResistance(
  value: number,
  min: number,
  max: number,
  resistance: number,
): number {
  if (value < min) {
    const overscroll = (value - min) * resistance;
    return min + clamp(overscroll, -MAX_OVERSCROLL, 0);
  }

  if (value > max) {
    const overscroll = (value - max) * resistance;
    return max + clamp(overscroll, 0, MAX_OVERSCROLL);
  }

  return value;
}

function buildTabContentWidths(tabs: RHCRibbonLayoutTab[]): number[] {
  return tabs.map((tab) => {
    const titleWidth = Math.ceil(measureTabTitleWidth(tab.title));
    const faviconWidth = tab.favicon
      ? TAB_FAVICON_OFFSET + TAB_FAVICON_WIDTH + TAB_FAVICON_GAP
      : 0;
    const closeButtonWidth = tab.showCloseButton ? TAB_CLOSE_BUTTON_WIDTH + TAB_CLOSE_BUTTON_GAP : 0;

    return Math.max(
      TAB_CONTENT_MIN_WIDTH,
      TAB_HORIZONTAL_PADDING +
        faviconWidth +
        titleWidth +
        TAB_TITLE_WIDTH_BUFFER +
        closeButtonWidth,
    );
  });
}

function buildRenderedTabs(
  tabs: RHCRibbonLayoutTab[],
  activeTabId: string | null,
): RHCRibbonRenderedTab[] {
  const contentWidths = buildTabContentWidths(tabs);
  let contentPosition = TAB_CONTENT_MARGIN;

  return tabs.map((tab, index) => {
    const contentWidth = contentWidths[index] ?? TAB_CONTENT_MIN_WIDTH;
    const position = contentPosition - index * TAB_CONTENT_OVERLAP_DISTANCE - TAB_CONTENT_MARGIN;
    contentPosition += contentWidth;

    return {
      ...tab,
      width: contentWidth + TAB_OVERLAP_DISTANCE,
      position,
      active: tab.id === activeTabId,
      hideFavicon: contentWidth + TAB_OVERLAP_DISTANCE <= TAB_MIN_WIDTH,
      isSmall: contentWidth < TAB_SIZE_SMALL,
      isSmaller: contentWidth < TAB_SIZE_SMALLER,
      isMini: contentWidth < TAB_SIZE_MINI,
    };
  });
}

interface RHCRibbonDragState {
  id: number;
  startX: number;
  lastX: number;
  lastTime: number;
  velocityX: number;
  moved: boolean;
}

@Component({
  selector: 'rhc-ribbon-layout',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './rhc-ribbon-layout.html',
  styleUrl: './rhc-ribbon-layout.css',
  host: {
    '[style.--tab-title-font]': 'tabTitleFont',
  },
})
export class RHCRibbonLayoutComponent implements AfterViewInit, OnDestroy {
  readonly tabs = input<RHCRibbonLayoutTab[]>([]);
  readonly controlledActiveTabId = input<string | null | undefined>(undefined, {
    alias: 'activeTabId',
  });
  readonly initialActiveTabId = input<string | null>(null);
  readonly theme = input<RHCRibbonTabTheme>('light');
  readonly tabEvent = output<RHCRibbonLayoutEvent>();
  readonly tabCreate = output<RHCRibbonLayoutCreateEvent>();
  readonly tabRemove = output<RHCRibbonLayoutRemoveEvent>();
  readonly tabSelect = output<RHCRibbonLayoutSelectEvent>();
  readonly tabsChange = output<RHCRibbonLayoutTab[]>();
  readonly tabReorder = output<{
    tab: RHCRibbonLayoutTab;
    previousIndex: number;
    currentIndex: number;
  }>();

  protected readonly renderedTabs = computed(() =>
    buildRenderedTabs(this.internalTabs(), this.activeTabIdState()),
  );
  protected readonly activeTab = computed(() => {
    const activeTabId = this.activeTabIdState();
    const tabs = this.internalTabs();

    if (activeTabId) {
      return tabs.find((tab) => tab.id === activeTabId) ?? tabs[0] ?? null;
    }

    return tabs[0] ?? null;
  });
  protected readonly activeTabContentContainerClass = computed(
    () => this.activeTab()?.contentContainerClass ?? '',
  );
  protected readonly activeTabContentContext = computed<RHCRibbonLayoutTabContentContext>(() => {
    const activeTab = this.activeTab();

    return {
      $implicit: activeTab?.contentContext ?? null,
      tab: activeTab,
      active: !!activeTab,
    };
  });
  protected readonly scrollOffset = signal(0);
  protected readonly isDragging = signal(false);
  protected readonly tabTitleFont = TAB_TITLE_FONT;

  private readonly internalTabs = signal<RHCRibbonLayoutTab[]>([]);
  private readonly activeTabIdState = signal<string | null>(null);
  private readonly contentWidth = signal(0);
  private readonly totalTabsWidth = computed(() => {
    const tabs = this.renderedTabs();
    const lastTab = tabs[tabs.length - 1];

    return lastTab ? lastTab.position + lastTab.width : 0;
  });
  private readonly maxScrollOffset = computed(() =>
    Math.max(0, this.totalTabsWidth() - this.contentWidth()),
  );
  private resizeObserver: ResizeObserver | null = null;
  private dragState: RHCRibbonDragState | null = null;
  private flingAnimationFrame: number | null = null;
  private bounceAnimationFrame: number | null = null;
  private suppressClickUntil = 0;
  private hasViewInitialized = false;
  private readonly eventListeners = new Map<
    RHCRibbonLayoutEventListenerType,
    Set<RHCRibbonLayoutEventListener>
  >();

  @ViewChild('content', { static: true })
  private readonly contentRef?: ElementRef<HTMLElement>;

  constructor() {
    effect(() => {
      const incomingTabs = this.tabs();
      this.internalTabs.set(incomingTabs);

      const externalActiveTabId = this.controlledActiveTabId();
      const requestedActiveTabId =
        externalActiveTabId !== undefined ? externalActiveTabId : this.initialActiveTabId();
      const currentActiveTabId = this.activeTabIdState();
      const nextActiveTabId =
        externalActiveTabId !== undefined
          ? this.resolveNextActiveTabId(incomingTabs, requestedActiveTabId, requestedActiveTabId)
          : this.resolveNextActiveTabId(incomingTabs, currentActiveTabId, requestedActiveTabId);

      if (nextActiveTabId !== currentActiveTabId) {
        this.activeTabIdState.set(nextActiveTabId);
      }
    });

    effect(() => {
      if (this.isDragging() || this.flingAnimationFrame !== null || this.bounceAnimationFrame !== null) {
        return;
      }

      const boundedOffset = this.getBoundedScrollOffset(this.scrollOffset());
      if (boundedOffset !== this.scrollOffset()) {
        this.scrollOffset.set(boundedOffset);
      }
    });

    effect(() => {
      if (
        !this.hasViewInitialized ||
        this.isDragging() ||
        this.flingAnimationFrame !== null ||
        this.bounceAnimationFrame !== null
      ) {
        return;
      }

      const activeTab = this.renderedTabs().find((tab) => tab.active);
      if (!activeTab) {
        return;
      }

      const viewportStart = this.scrollOffset();
      const viewportEnd = viewportStart + this.contentWidth();
      const tabStart = activeTab.position;
      const tabEnd = activeTab.position + activeTab.width;

      if (tabStart < viewportStart) {
        this.scrollOffset.set(clamp(tabStart, 0, this.maxScrollOffset()));
        return;
      }

      if (tabEnd > viewportEnd) {
        this.scrollOffset.set(
          clamp(tabEnd - this.contentWidth(), 0, this.maxScrollOffset()),
        );
      }
    });
  }

  ngAfterViewInit(): void {
    const contentElement = this.contentRef?.nativeElement;
    if (!contentElement) {
      return;
    }

    this.contentWidth.set(contentElement.clientWidth);
    this.resizeObserver = new ResizeObserver(() => {
      this.contentWidth.set(contentElement.clientWidth);
    });
    this.resizeObserver.observe(contentElement);
    this.hasViewInitialized = true;
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    this.stopFling();
    this.stopBounce();
  }

  public addEventListener(
    type: RHCRibbonLayoutEventListenerType,
    listener: RHCRibbonLayoutEventListener,
  ): () => void {
    const listeners = this.eventListeners.get(type) ?? new Set<RHCRibbonLayoutEventListener>();
    listeners.add(listener);
    this.eventListeners.set(type, listeners);

    return () => this.removeEventListener(type, listener);
  }

  public removeEventListener(
    type: RHCRibbonLayoutEventListenerType,
    listener: RHCRibbonLayoutEventListener,
  ): void {
    const listeners = this.eventListeners.get(type);
    if (!listeners) {
      return;
    }

    listeners.delete(listener);
    if (listeners.size === 0) {
      this.eventListeners.delete(type);
    }
  }

  public setActiveTab(tabId: string | null, origin: RHCRibbonLayoutEventOrigin = 'api'): void {
    const previousActiveTabId = this.activeTabIdState();
    const nextActiveTabId = this.resolveNextActiveTabId(this.internalTabs(), tabId, tabId);

    if (nextActiveTabId === previousActiveTabId) {
      return;
    }

    const tabs = this.internalTabs();
    const previousTab = previousActiveTabId
      ? tabs.find((tab) => tab.id === previousActiveTabId) ?? null
      : null;
    const nextTab = nextActiveTabId ? tabs.find((tab) => tab.id === nextActiveTabId) ?? null : null;

    this.activeTabIdState.set(nextActiveTabId);
    this.emitLifecycleEvent({
      type: 'select',
      origin,
      tab: nextTab,
      index: nextTab ? tabs.findIndex((tab) => tab.id === nextTab.id) : -1,
      previousTab,
      previousIndex: previousTab ? tabs.findIndex((tab) => tab.id === previousTab.id) : -1,
      tabs,
      timestamp: Date.now(),
    });
  }

  public addTab(
    tab: RHCRibbonLayoutTab,
    options?: {
      activate?: boolean;
      index?: number;
    },
  ): void {
    const tabs = this.internalTabs();
    const insertIndex = clamp(options?.index ?? tabs.length, 0, tabs.length);
    const nextTabs = [...tabs];
    const shouldActivate = options?.activate !== false || !this.activeTabIdState();

    nextTabs.splice(insertIndex, 0, tab);
    this.commitTabs(nextTabs);
    this.emitLifecycleEvent({
      type: 'create',
      origin: 'api',
      tab,
      index: insertIndex,
      activated: shouldActivate,
      tabs: nextTabs,
      timestamp: Date.now(),
    });

    if (options?.activate !== false) {
      this.setActiveTab(tab.id);
    } else if (!this.activeTabIdState()) {
      this.setActiveTab(nextTabs[0]?.id ?? null);
    }
  }

  public closeTab(tabId: string, origin: RHCRibbonLayoutEventOrigin = 'api'): void {
    const tabs = this.internalTabs();
    const closeIndex = tabs.findIndex((tab) => tab.id === tabId);

    if (closeIndex < 0) {
      return;
    }

    const closingTab = tabs[closeIndex]!;
    const nextTabs = tabs.filter((tab) => tab.id !== tabId);
    const nextActiveTabId =
      this.activeTabIdState() === tabId
        ? (nextTabs[closeIndex] ?? nextTabs[closeIndex - 1] ?? null)?.id ?? null
        : this.resolveNextActiveTabId(nextTabs, this.activeTabIdState(), null);
    this.commitTabs(nextTabs);
    this.emitLifecycleEvent({
      type: 'remove',
      origin,
      tab: closingTab,
      index: closeIndex,
      nextActiveTabId,
      tabs: nextTabs,
      timestamp: Date.now(),
    });

    if (this.activeTabIdState() === tabId) {
      const fallbackTab = nextTabs[closeIndex] ?? nextTabs[closeIndex - 1] ?? null;
      this.setActiveTab(fallbackTab?.id ?? null, origin);
      return;
    }

    this.setActiveTab(this.resolveNextActiveTabId(nextTabs, this.activeTabIdState(), null), origin);
  }

  public reorderTab(tabId: string, targetIndex: number): void {
    const tabs = this.internalTabs();
    const previousIndex = tabs.findIndex((tab) => tab.id === tabId);

    if (previousIndex < 0) {
      return;
    }

    const currentIndex = clamp(targetIndex, 0, Math.max(0, tabs.length - 1));
    if (currentIndex === previousIndex) {
      return;
    }

    const nextTabs = [...tabs];
    const [movedTab] = nextTabs.splice(previousIndex, 1);
    if (!movedTab) {
      return;
    }

    nextTabs.splice(currentIndex, 0, movedTab);
    this.commitTabs(nextTabs);
    this.tabReorder.emit({
      tab: movedTab,
      previousIndex,
      currentIndex,
    });
  }

  protected selectTab(tabId: string, event: MouseEvent): void {
    if (event.timeStamp <= this.suppressClickUntil) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    this.setActiveTab(tabId, 'ui');
  }

  protected handlePointerDown(event: PointerEvent): void {
    if (event.pointerType === 'mouse' && event.button !== 0) {
      return;
    }

    const target = event.currentTarget as HTMLElement | null;
    target?.setPointerCapture(event.pointerId);
    this.stopFling();
    this.stopBounce();
    this.dragState = {
      id: event.pointerId,
      startX: event.clientX,
      lastX: event.clientX,
      lastTime: event.timeStamp,
      velocityX: 0,
      moved: false,
    };
    this.isDragging.set(false);
  }

  protected handlePointerMove(event: PointerEvent): void {
    if (!this.dragState || this.dragState.id !== event.pointerId) {
      return;
    }

    const deltaX = event.clientX - this.dragState.lastX;
    const elapsedMs = Math.max(1, event.timeStamp - this.dragState.lastTime);
    const nextOffset = applyOverscrollResistance(
      this.scrollOffset() - deltaX,
      0,
      this.maxScrollOffset(),
      DRAG_OVERSCROLL_RESISTANCE,
    );

    if (!this.dragState.moved && Math.abs(event.clientX - this.dragState.startX) > 4) {
      this.dragState.moved = true;
      this.isDragging.set(true);
    }

    if (this.dragState.moved) {
      event.preventDefault();
    }

    this.scrollOffset.set(nextOffset);
    this.dragState.velocityX = (-deltaX / elapsedMs) * 0.35 + this.dragState.velocityX * 0.65;
    this.dragState.lastX = event.clientX;
    this.dragState.lastTime = event.timeStamp;
  }

  protected handlePointerUp(event: PointerEvent): void {
    if (!this.dragState || this.dragState.id !== event.pointerId) {
      return;
    }

    const target = event.currentTarget as HTMLElement | null;
    if (target?.hasPointerCapture(event.pointerId)) {
      target.releasePointerCapture(event.pointerId);
    }

    const shouldFling =
      this.dragState.moved && Math.abs(this.dragState.velocityX) > 0.15 && this.maxScrollOffset() > 0;
    const flingVelocity = this.dragState.velocityX;
    const shouldSuppressClick = this.dragState.moved;

    this.dragState = null;
    this.isDragging.set(false);
    if (shouldSuppressClick) {
      this.suppressClickUntil = event.timeStamp + 250;
    }

    if (shouldFling) {
      this.startFling(flingVelocity);
      return;
    }

    if (this.isOutOfBounds(this.scrollOffset())) {
      this.startBounceToBounds();
    }
  }

  protected handleCloseButtonPointerDown(event: PointerEvent): void {
    event.preventDefault();
    event.stopPropagation();
  }

  protected closeTabFromButton(tabId: string, event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.closeTab(tabId, 'ui');
  }

  private startFling(initialVelocity: number): void {
    this.stopFling();
    this.stopBounce();

    let velocity = initialVelocity;
    let lastTimestamp: number | null = null;

    const tick = (timestamp: number) => {
      if (lastTimestamp === null) {
        lastTimestamp = timestamp;
        this.flingAnimationFrame = requestAnimationFrame(tick);
        return;
      }

      const deltaMs = Math.max(1, timestamp - lastTimestamp);
      lastTimestamp = timestamp;

      const nextOffset = applyOverscrollResistance(
        this.scrollOffset() + velocity * deltaMs,
        0,
        this.maxScrollOffset(),
        FLING_OVERSCROLL_RESISTANCE,
      );
      this.scrollOffset.set(nextOffset);

      const deceleration = 0.0032 * deltaMs;
      if (velocity > 0) {
        velocity = Math.max(0, velocity - deceleration);
      } else {
        velocity = Math.min(0, velocity + deceleration);
      }

      if (this.isOutOfBounds(nextOffset)) {
        velocity *= 0.82;
      }

      if (Math.abs(velocity) < 0.02) {
        this.stopFling();
        if (this.isOutOfBounds(this.scrollOffset())) {
          this.startBounceToBounds();
        }
        return;
      }

      this.flingAnimationFrame = requestAnimationFrame(tick);
    };

    this.flingAnimationFrame = requestAnimationFrame(tick);
  }

  private stopFling(): void {
    if (this.flingAnimationFrame !== null) {
      cancelAnimationFrame(this.flingAnimationFrame);
      this.flingAnimationFrame = null;
    }
  }

  private startBounceToBounds(): void {
    this.stopBounce();

    const tick = () => {
      const currentOffset = this.scrollOffset();
      const boundedOffset = this.getBoundedScrollOffset(currentOffset);
      const delta = boundedOffset - currentOffset;

      if (Math.abs(delta) < 0.5) {
        this.scrollOffset.set(boundedOffset);
        this.stopBounce();
        return;
      }

      this.scrollOffset.set(currentOffset + delta * 0.2);
      this.bounceAnimationFrame = requestAnimationFrame(tick);
    };

    this.bounceAnimationFrame = requestAnimationFrame(tick);
  }

  private stopBounce(): void {
    if (this.bounceAnimationFrame !== null) {
      cancelAnimationFrame(this.bounceAnimationFrame);
      this.bounceAnimationFrame = null;
    }
  }

  private isOutOfBounds(offset: number): boolean {
    return offset < 0 || offset > this.maxScrollOffset();
  }

  private getBoundedScrollOffset(offset: number): number {
    return clamp(offset, 0, this.maxScrollOffset());
  }

  private emitLifecycleEvent(event: RHCRibbonLayoutEvent): void {
    switch (event.type) {
      case 'create':
        this.tabCreate.emit(event);
        break;
      case 'remove':
        this.tabRemove.emit(event);
        break;
      case 'select':
        this.tabSelect.emit(event);
        break;
    }

    this.tabEvent.emit(event);
    this.notifyEventListeners(event.type, event);
    this.notifyEventListeners('*', event);
  }

  private notifyEventListeners(
    type: RHCRibbonLayoutEventListenerType,
    event: RHCRibbonLayoutEvent,
  ): void {
    const listeners = this.eventListeners.get(type);
    if (!listeners) {
      return;
    }

    for (const listener of listeners) {
      listener(event);
    }
  }

  private commitTabs(tabs: RHCRibbonLayoutTab[]): void {
    this.internalTabs.set(tabs);
    this.tabsChange.emit(tabs);
  }

  private resolveNextActiveTabId(
    tabs: RHCRibbonLayoutTab[],
    preferredActiveTabId: string | null,
    fallbackActiveTabId: string | null,
  ): string | null {
    if (preferredActiveTabId && tabs.some((tab) => tab.id === preferredActiveTabId)) {
      return preferredActiveTabId;
    }

    if (fallbackActiveTabId && tabs.some((tab) => tab.id === fallbackActiveTabId)) {
      return fallbackActiveTabId;
    }

    return tabs[0]?.id ?? null;
  }
}
