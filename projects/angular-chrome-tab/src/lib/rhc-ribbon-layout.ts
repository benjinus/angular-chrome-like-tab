import { CommonModule } from '@angular/common';
import { ConnectedPosition, OverlayModule } from '@angular/cdk/overlay';
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
const COMPACT_TAB_CONTENT_MARGIN = 4;
const COMPACT_TAB_OVERLAP_DISTANCE = 2;
const COMPACT_TAB_OVERLAP_WIDTH = COMPACT_TAB_CONTENT_MARGIN * 2 + COMPACT_TAB_OVERLAP_DISTANCE;
const TAB_MIN_WIDTH = 96;
const TAB_CONTENT_MIN_WIDTH = TAB_MIN_WIDTH - TAB_OVERLAP_DISTANCE;
const COMPACT_TAB_CONTENT_MIN_WIDTH = 84;
const COMPACT_TAB_CONTENT_MAX_WIDTH = 176;
const TAB_TITLE_FONT =
  '500 13px "SF Pro SC","SF Pro Display","SF Pro Icons","PingFang SC","微软雅黑","Microsoft YaHei","Helvetica Neue","Helvetica","Arial",sans-serif';
const TAB_HORIZONTAL_PADDING = 24;
const TAB_TITLE_WIDTH_BUFFER = 6;
const COMPACT_TAB_HORIZONTAL_PADDING = 18;
const COMPACT_TAB_TITLE_WIDTH_BUFFER = 4;
const TAB_FAVICON_WIDTH = 16;
const TAB_FAVICON_GAP = 8;
const TAB_FAVICON_OFFSET = 4;
const COMPACT_TAB_FAVICON_WIDTH = 14;
const COMPACT_TAB_FAVICON_GAP = 6;
const COMPACT_TAB_FAVICON_OFFSET = 0;
const TAB_CLOSE_BUTTON_WIDTH = 16;
const TAB_CLOSE_BUTTON_GAP = 8;
const COMPACT_TAB_CLOSE_BUTTON_WIDTH = 14;
const COMPACT_TAB_CLOSE_BUTTON_GAP = 6;
const TAB_SIZE_SMALL = TAB_CONTENT_MIN_WIDTH + 1;
const TAB_SIZE_SMALLER = 60;
const TAB_SIZE_MINI = 48;
const TAB_REORDER_DRAG_THRESHOLD = 4;

export interface RHCRibbonTabItem {
  id: string;
  title: string;
  favicon?: string | null;
  showCloseButton?: boolean;
}

export type RHCRibbonTabTheme = 'light' | 'dark';
export type RHCRibbonLayoutMode = 'default' | 'compact';
export type RHCRibbonLayoutEventType = 'create' | 'remove' | 'select';
export type RHCRibbonLayoutEventOrigin = 'api' | 'ui';
export type RHCRibbonLayoutEventListenerType = RHCRibbonLayoutEventType | '*';

export interface RHCRibbonLayoutTabBarMenuContext<TContext = unknown> {
  $implicit: {
    activeTabId: string | null;
    activeTab: RHCRibbonLayoutTab<TContext> | null;
    tabs: RHCRibbonLayoutTab<TContext>[];
  };
  close: () => void;
}

export interface RHCRibbonLayoutTabBarMenuClickEvent<TContext = unknown> {
  origin: 'ui';
  hasTemplate: boolean;
  isOpen: boolean;
  activeTabId: string | null;
  tabs: RHCRibbonLayoutTab<TContext>[];
  timestamp: number;
}

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
  showCloseButton?: boolean;
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
    this.showCloseButton = config.showCloseButton;
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

function shouldShowCloseButton(
  tab: RHCRibbonLayoutTab | RHCRibbonRenderedTab,
  mode: RHCRibbonLayoutMode,
): boolean {
  if (mode === 'compact') {
    return ('active' in tab ? tab.active === true : false) && tab.showCloseButton !== false;
  }

  return tab.showCloseButton === true;
}

function buildTabContentWidths(
  tabs: RHCRibbonLayoutTab[],
  mode: RHCRibbonLayoutMode,
): number[] {
  return tabs.map((tab) => {
    const titleWidth = Math.ceil(measureTabTitleWidth(tab.title));
    const faviconWidth = tab.favicon
      ? mode === 'compact'
        ? COMPACT_TAB_FAVICON_OFFSET + COMPACT_TAB_FAVICON_WIDTH + COMPACT_TAB_FAVICON_GAP
        : TAB_FAVICON_OFFSET + TAB_FAVICON_WIDTH + TAB_FAVICON_GAP
      : 0;
    const closeButtonWidth = shouldShowCloseButton(tab, mode)
      ? mode === 'compact'
        ? COMPACT_TAB_CLOSE_BUTTON_WIDTH + COMPACT_TAB_CLOSE_BUTTON_GAP
        : TAB_CLOSE_BUTTON_WIDTH + TAB_CLOSE_BUTTON_GAP
      : 0;
    const contentWidth =
      (mode === 'compact' ? COMPACT_TAB_HORIZONTAL_PADDING : TAB_HORIZONTAL_PADDING) +
      faviconWidth +
      titleWidth +
      (mode === 'compact' ? COMPACT_TAB_TITLE_WIDTH_BUFFER : TAB_TITLE_WIDTH_BUFFER) +
      closeButtonWidth;

    if (mode === 'compact') {
      return clamp(contentWidth, COMPACT_TAB_CONTENT_MIN_WIDTH, COMPACT_TAB_CONTENT_MAX_WIDTH);
    }

    return Math.max(TAB_CONTENT_MIN_WIDTH, contentWidth);
  });
}

function buildRenderedTabs(
  tabs: RHCRibbonLayoutTab[],
  activeTabId: string | null,
  mode: RHCRibbonLayoutMode,
): RHCRibbonRenderedTab[] {
  const contentWidths = buildTabContentWidths(tabs, mode);
  let contentPosition = mode === 'compact' ? COMPACT_TAB_CONTENT_MARGIN : TAB_CONTENT_MARGIN;

  return tabs.map((tab, index) => {
    const contentWidth = contentWidths[index] ?? TAB_CONTENT_MIN_WIDTH;
    const width =
      mode === 'compact'
        ? contentWidth + COMPACT_TAB_OVERLAP_WIDTH
        : contentWidth + TAB_OVERLAP_DISTANCE;
    const position =
      mode === 'compact'
        ? contentPosition - index * COMPACT_TAB_OVERLAP_DISTANCE - COMPACT_TAB_CONTENT_MARGIN
        : contentPosition - index * TAB_CONTENT_OVERLAP_DISTANCE - TAB_CONTENT_MARGIN;
    contentPosition += contentWidth;

    return {
      ...tab,
      width,
      position,
      active: tab.id === activeTabId,
      hideFavicon:
        mode === 'compact' ? false : contentWidth + TAB_OVERLAP_DISTANCE <= TAB_MIN_WIDTH,
      isSmall: mode === 'compact' ? false : contentWidth < TAB_SIZE_SMALL,
      isSmaller: mode === 'compact' ? false : contentWidth < TAB_SIZE_SMALLER,
      isMini: mode === 'compact' ? false : contentWidth < TAB_SIZE_MINI,
    };
  });
}

interface RHCRibbonDragState {
  id: number;
  tabId: string;
  startX: number;
  initialLeft: number;
  currentLeft: number;
  width: number;
  moved: boolean;
}

@Component({
  selector: 'rhc-ribbon-layout',
  standalone: true,
  imports: [CommonModule, OverlayModule],
  templateUrl: './rhc-ribbon-layout.html',
  styleUrl: './rhc-ribbon-layout.css',
  host: {
    '[style.--tab-title-font]': 'tabTitleFont',
  },
})
export class RHCRibbonLayoutComponent implements AfterViewInit, OnDestroy {
  readonly tabs = input<RHCRibbonLayoutTab[]>([]);
  readonly mode = input<RHCRibbonLayoutMode>('default');
  readonly enableTabReorder = input(false);
  readonly showTabBarMenuButton = input(false);
  readonly tabBarMenuTemplate = input<TemplateRef<RHCRibbonLayoutTabBarMenuContext> | null>(null);
  readonly controlledActiveTabId = input<string | null | undefined>(undefined, {
    alias: 'activeTabId',
  });
  readonly initialActiveTabId = input<string | null>(null);
  readonly theme = input<RHCRibbonTabTheme>('light');
  readonly tabEvent = output<RHCRibbonLayoutEvent>();
  readonly tabCreate = output<RHCRibbonLayoutCreateEvent>();
  readonly tabRemove = output<RHCRibbonLayoutRemoveEvent>();
  readonly tabSelect = output<RHCRibbonLayoutSelectEvent>();
  readonly tabBarMenuClick = output<RHCRibbonLayoutTabBarMenuClickEvent>();
  readonly tabsChange = output<RHCRibbonLayoutTab[]>();
  readonly tabReorder = output<{
    tab: RHCRibbonLayoutTab;
    previousIndex: number;
    currentIndex: number;
  }>();

  protected readonly renderedTabs = computed(() =>
    buildRenderedTabs(this.internalTabs(), this.activeTabIdState(), this.mode()),
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
  protected readonly tabBarMenuContext = computed<RHCRibbonLayoutTabBarMenuContext>(() => ({
    $implicit: {
      activeTabId: this.activeTabIdState(),
      activeTab: this.activeTab(),
      tabs: this.internalTabs(),
    },
    close: () => this.closeTabBarMenu(),
  }));
  protected readonly scrollOffset = signal(0);
  protected readonly isDragging = signal(false);
  protected readonly isTabBarMenuOpen = signal(false);
  protected readonly tabTitleFont = TAB_TITLE_FONT;
  protected readonly tabBarMenuPositions: ConnectedPosition[] = [
    {
      originX: 'end',
      originY: 'bottom',
      overlayX: 'end',
      overlayY: 'top',
      offsetY: 8,
    },
    {
      originX: 'end',
      originY: 'top',
      overlayX: 'end',
      overlayY: 'bottom',
      offsetY: -8,
    },
  ];

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
      if (this.isDragging()) {
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
        this.isDragging()
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

  protected handleTabPointerDown(tabId: string, event: PointerEvent): void {
    if (!this.enableTabReorder()) {
      return;
    }

    if (event.pointerType === 'mouse' && event.button !== 0) {
      return;
    }

    const target = event.currentTarget as HTMLElement | null;
    const renderedTab = this.renderedTabs().find((tab) => tab.id === tabId);
    if (!target || !renderedTab) {
      return;
    }

    target?.setPointerCapture(event.pointerId);
    this.dragState = {
      id: event.pointerId,
      tabId,
      startX: event.clientX,
      initialLeft: renderedTab.position - this.scrollOffset(),
      currentLeft: renderedTab.position - this.scrollOffset(),
      width: renderedTab.width,
      moved: false,
    };
    this.isDragging.set(false);
  }

  protected handleTabPointerMove(tabId: string, event: PointerEvent): void {
    if (!this.enableTabReorder()) {
      return;
    }

    if (!this.dragState || this.dragState.id !== event.pointerId || this.dragState.tabId !== tabId) {
      return;
    }

    const deltaX = event.clientX - this.dragState.startX;
    if (!this.dragState.moved && Math.abs(deltaX) > TAB_REORDER_DRAG_THRESHOLD) {
      this.dragState.moved = true;
      this.isDragging.set(true);
    }

    if (this.dragState.moved) {
      event.preventDefault();
      this.dragState.currentLeft = this.dragState.initialLeft + deltaX;
      this.maybeReorderDraggedTab();
    }
  }

  protected handleTabPointerUp(tabId: string, event: PointerEvent): void {
    if (!this.enableTabReorder()) {
      return;
    }

    if (!this.dragState || this.dragState.id !== event.pointerId || this.dragState.tabId !== tabId) {
      return;
    }

    const target = event.currentTarget as HTMLElement | null;
    if (target?.hasPointerCapture(event.pointerId)) {
      target.releasePointerCapture(event.pointerId);
    }

    const shouldSuppressClick = this.dragState.moved;

    this.dragState = null;
    this.isDragging.set(false);
    if (shouldSuppressClick) {
      this.suppressClickUntil = event.timeStamp + 250;
    }
  }

  protected handleTabsWheel(event: WheelEvent): void {
    if (this.isDragging() || this.maxScrollOffset() <= 0) {
      return;
    }

    const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
    if (!delta) {
      return;
    }

    const nextOffset = clamp(this.scrollOffset() + delta, 0, this.maxScrollOffset());
    if (nextOffset === this.scrollOffset()) {
      return;
    }

    event.preventDefault();
    this.scrollOffset.set(nextOffset);
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

  protected handleTabBarMenuButtonClick(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();

    const hasTemplate = !!this.tabBarMenuTemplate();
    const nextOpen = hasTemplate ? !this.isTabBarMenuOpen() : false;

    this.isTabBarMenuOpen.set(nextOpen);
    this.tabBarMenuClick.emit({
      origin: 'ui',
      hasTemplate,
      isOpen: nextOpen,
      activeTabId: this.activeTabIdState(),
      tabs: this.internalTabs(),
      timestamp: Date.now(),
    });
  }

  protected closeTabBarMenu(): void {
    this.isTabBarMenuOpen.set(false);
  }

  protected shouldRenderCloseButton(tab: RHCRibbonLayoutTab): boolean {
    return shouldShowCloseButton(tab, this.mode());
  }

  private getBoundedScrollOffset(offset: number): number {
    return clamp(offset, 0, this.maxScrollOffset());
  }

  protected isDraggedTab(tabId: string): boolean {
    return this.dragState?.moved === true && this.dragState.tabId === tabId;
  }

  protected getTabTransform(tab: RHCRibbonRenderedTab): string {
    if (this.dragState?.moved && this.dragState.tabId === tab.id) {
      return `translate3d(${this.dragState.currentLeft}px, 0, 0)`;
    }

    return `translate3d(${tab.position - this.scrollOffset()}px, 0, 0)`;
  }

  private maybeReorderDraggedTab(): void {
    if (!this.dragState?.moved) {
      return;
    }

    const tabs = this.renderedTabs();
    const currentIndex = tabs.findIndex((tab) => tab.id === this.dragState?.tabId);
    const draggedTab = currentIndex >= 0 ? tabs[currentIndex] : null;
    if (!draggedTab) {
      return;
    }

    const dragCenter = this.dragState.currentLeft + this.scrollOffset() + this.dragState.width / 2;
    let destinationIndex = currentIndex;
    let closestDistance = Number.POSITIVE_INFINITY;

    tabs.forEach((tab, index) => {
      const tabCenter = tab.position + tab.width / 2;
      const distance = Math.abs(tabCenter - dragCenter);

      if (distance < closestDistance) {
        closestDistance = distance;
        destinationIndex = index;
      }
    });

    if (destinationIndex !== currentIndex) {
      this.reorderTab(draggedTab.id, destinationIndex);
    }
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
