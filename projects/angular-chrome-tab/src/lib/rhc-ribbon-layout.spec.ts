import { Component, TemplateRef, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { RHCRibbonLayoutComponent, RHCRibbonLayoutTab } from './rhc-ribbon-layout';

const TAB_WITH_ICON =
  'data:image/svg+xml;utf8,%3Csvg xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22 width%3D%2216%22 height%3D%2216%22%3E%3Crect width%3D%2216%22 height%3D%2216%22 fill%3D%22%23000%22%2F%3E%3C%2Fsvg%3E';
const pointerCaptures = new WeakMap<HTMLElement, Set<number>>();

function parseTranslateX(element: HTMLElement | null): number {
  return Number.parseFloat(element?.style.transform.match(/translate3d\(([-\d.]+)px/)?.[1] ?? '0');
}

function dispatchPointerEvent(
  element: Element | null,
  type: string,
  init: Partial<PointerEventInit> & { timeStamp?: number } = {},
): void {
  if (!element) {
    return;
  }

  const event = new PointerEvent(type, {
    bubbles: true,
    cancelable: true,
    pointerId: init.pointerId ?? 1,
    pointerType: init.pointerType ?? 'mouse',
    clientX: init.clientX ?? 0,
    clientY: init.clientY ?? 0,
    button: init.button ?? 0,
  });

  if (init.timeStamp !== undefined) {
    Object.defineProperty(event, 'timeStamp', {
      configurable: true,
      value: init.timeStamp,
    });
  }

  element.dispatchEvent(event);
}

@Component({
  standalone: true,
  imports: [RHCRibbonLayoutComponent],
  template: `
    <rhc-ribbon-layout
      [tabs]="tabs"
      [showTabBarMenuButton]="showTabBarMenuButton"
      [tabBarMenuTemplate]="menuTemplate"
      (tabBarMenuClick)="handleMenuClick($event)"
    />

    <ng-template #menuTemplate let-close="close">
      <div class="test-tab-bar-menu">
        <button type="button" class="test-tab-bar-menu-close" (click)="close()">Close</button>
      </div>
    </ng-template>
  `,
})
class RibbonLayoutTabBarMenuHostComponent {
  readonly tabs = [new RHCRibbonLayoutTab({ id: '1', title: 'One' })];
  readonly showTabBarMenuButton = true;
  menuClicks: unknown[] = [];

  @ViewChild(RHCRibbonLayoutComponent)
  readonly layout?: RHCRibbonLayoutComponent;

  @ViewChild('menuTemplate', { static: true })
  readonly menuTemplate?: TemplateRef<unknown>;

  handleMenuClick(event: unknown): void {
    this.menuClicks.push(event);
  }
}

describe('RHCRibbonLayoutComponent', () => {
  let component: RHCRibbonLayoutComponent;
  let fixture: ComponentFixture<RHCRibbonLayoutComponent>;

  beforeAll(() => {
    if (!globalThis.PointerEvent) {
      class PointerEventMock extends MouseEvent implements PointerEvent {
        readonly height = 1;
        readonly isPrimary = true;
        readonly pointerId: number;
        readonly pointerType: string;
        readonly pressure = 0;
        readonly tangentialPressure = 0;
        readonly tiltX = 0;
        readonly tiltY = 0;
        readonly twist = 0;
        readonly width = 1;
        readonly altitudeAngle = 0;
        readonly azimuthAngle = 0;
        readonly persistentDeviceId = 0;

        constructor(type: string, init?: PointerEventInit) {
          super(type, init);
          this.pointerId = init?.pointerId ?? 1;
          this.pointerType = init?.pointerType ?? 'mouse';
        }

        getCoalescedEvents(): PointerEvent[] {
          return [];
        }

        getPredictedEvents(): PointerEvent[] {
          return [];
        }
      }

      globalThis.PointerEvent = PointerEventMock as typeof PointerEvent;
    }

    if (!HTMLElement.prototype.setPointerCapture) {
      HTMLElement.prototype.setPointerCapture = function setPointerCapture(pointerId: number): void {
        const captures = pointerCaptures.get(this) ?? new Set<number>();
        captures.add(pointerId);
        pointerCaptures.set(this, captures);
      };
    }

    if (!HTMLElement.prototype.hasPointerCapture) {
      HTMLElement.prototype.hasPointerCapture = function hasPointerCapture(pointerId: number): boolean {
        return pointerCaptures.get(this)?.has(pointerId) ?? false;
      };
    }

    if (!HTMLElement.prototype.releasePointerCapture) {
      HTMLElement.prototype.releasePointerCapture = function releasePointerCapture(
        pointerId: number,
      ): void {
        pointerCaptures.get(this)?.delete(pointerId);
      };
    }

    if (!globalThis.ResizeObserver) {
      class ResizeObserverMock implements ResizeObserver {
        observe(): void {}
        unobserve(): void {}
        disconnect(): void {}
      }

      globalThis.ResizeObserver = ResizeObserverMock;
    }

    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
      () =>
        ({
          font: '',
          measureText: (text: string) => ({ width: text.length * 7 }),
        }) as CanvasRenderingContext2D,
    );
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RHCRibbonLayoutComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(RHCRibbonLayoutComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('tabs', [
      { id: '1', title: 'One' },
      { id: '2', title: 'Two With Icon', favicon: TAB_WITH_ICON },
    ]);
    fixture.componentRef.setInput('initialActiveTabId', '1');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('does not render an icon placeholder when favicon is omitted', () => {
    const tabElements = Array.from(
      fixture.nativeElement.querySelectorAll('.ribbon-tab'),
    ) as HTMLElement[];
    const titleOnlyTab = tabElements[0] as HTMLElement;
    const titledTabContent = titleOnlyTab.querySelector('.ribbon-tab-content');

    expect(titleOnlyTab.classList.contains('ribbon-tab--has-favicon')).toBe(false);
    expect(titleOnlyTab.querySelector('.ribbon-tab-favicon')).toBeNull();
    expect(titledTabContent?.classList.contains('ribbon-tab-content--title-only')).toBe(true);
  });

  it('renders the favicon element when favicon is provided', () => {
    const tabElements = Array.from(
      fixture.nativeElement.querySelectorAll('.ribbon-tab'),
    ) as HTMLElement[];
    const iconTab = tabElements[1] as HTMLElement;
    const faviconElement = iconTab.querySelector('.ribbon-tab-favicon') as HTMLElement | null;

    expect(iconTab.classList.contains('ribbon-tab--has-favicon')).toBe(true);
    expect(faviconElement).not.toBeNull();
    expect(faviconElement?.hasAttribute('hidden')).toBe(false);
  });

  it('does not render close buttons by default', () => {
    expect(fixture.nativeElement.querySelectorAll('.ribbon-tab-close').length).toBe(0);
  });

  it('renders a close button only for tabs with showCloseButton enabled', () => {
    fixture.componentRef.setInput('tabs', [
      { id: '1', title: 'One' },
      { id: '2', title: 'Closable', showCloseButton: true },
    ]);
    fixture.detectChanges();

    const tabElements = Array.from(fixture.nativeElement.querySelectorAll('.ribbon-tab'));
    const firstTab = tabElements[0] as HTMLElement;
    const closableTab = tabElements[1] as HTMLElement;

    expect(firstTab.querySelector('.ribbon-tab-close')).toBeNull();
    expect(closableTab.querySelector('.ribbon-tab-close')).not.toBeNull();
  });

  it('emits remove events and removes the tab when its close button is clicked', () => {
    fixture.componentRef.setInput('tabs', [
      { id: '1', title: 'One' },
      { id: '2', title: 'Closable', showCloseButton: true },
    ]);
    fixture.componentRef.setInput('initialActiveTabId', '2');
    fixture.detectChanges();

    const emitSpy = vi.spyOn(component.tabRemove, 'emit');
    const closeButton = fixture.nativeElement.querySelector('.ribbon-tab-close') as HTMLElement | null;

    expect(closeButton).not.toBeNull();

    closeButton?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    fixture.detectChanges();

    expect(emitSpy).toHaveBeenCalledWith({
      type: 'remove',
      origin: 'ui',
      tab: expect.objectContaining({ id: '2', title: 'Closable', showCloseButton: true }),
      index: 1,
      nextActiveTabId: '1',
      tabs: [expect.objectContaining({ id: '1' })],
      timestamp: expect.any(Number),
    });
    expect(fixture.nativeElement.querySelectorAll('.ribbon-tab').length).toBe(1);
  });

  it('sizes tabs from measured title width instead of clamping long titles', () => {
    fixture.componentRef.setInput('tabs', [
      {
        id: '1',
        title:
          'A very long ribbon tab title that should keep expanding instead of being capped with an ellipsis',
      },
    ]);
    fixture.detectChanges();

    const tabElement = fixture.nativeElement.querySelector('.ribbon-tab') as HTMLElement | null;
    const width = Number.parseFloat(tabElement?.style.width ?? '0');

    expect(width).toBeGreaterThan(300);
  });

  it('does not apply ellipsis styling to tab titles', () => {
    const titleElement = fixture.nativeElement.querySelector('.ribbon-tab-title') as HTMLElement | null;

    expect(titleElement).not.toBeNull();
    expect(getComputedStyle(titleElement!).textOverflow).not.toBe('ellipsis');
  });

  it('applies the tab title font sizing from TAB_TITLE_FONT', () => {
    const titleElement = fixture.nativeElement.querySelector('.ribbon-tab-title') as HTMLElement | null;
    const computedStyle = getComputedStyle(titleElement!);

    expect(titleElement).not.toBeNull();
    expect(computedStyle.fontSize).toBe('13px');
    expect(computedStyle.fontWeight).toBe('500');
  });

  it('does not render a tab bar menu button by default', () => {
    const menuButton = fixture.nativeElement.querySelector('.ribbon-tabs-menu-button') as HTMLElement | null;
    expect(menuButton).toBeNull();
  });

  it('renders a tab bar menu button when explicitly enabled in default mode', () => {
    fixture.componentRef.setInput('showTabBarMenuButton', true);
    fixture.detectChanges();

    const menuButton = fixture.nativeElement.querySelector('.ribbon-tabs-menu-button') as HTMLElement | null;
    expect(menuButton).not.toBeNull();
  });

  it('uses light theme styling for the tab bar menu button by default', () => {
    fixture.componentRef.setInput('showTabBarMenuButton', true);
    fixture.detectChanges();

    const menuButton = fixture.nativeElement.querySelector('.ribbon-tabs-menu-button') as HTMLElement | null;
    const computedStyle = getComputedStyle(menuButton!);

    expect(menuButton).not.toBeNull();
    expect(computedStyle.color).toBe('rgb(99, 109, 124)');
    expect(computedStyle.backgroundColor).toBe('rgba(233, 237, 243, 0.9)');
  });

  it('does not use a default shadow for the tab bar menu button in light theme', () => {
    fixture.componentRef.setInput('showTabBarMenuButton', true);
    fixture.detectChanges();

    const menuButton = fixture.nativeElement.querySelector('.ribbon-tabs-menu-button') as HTMLElement | null;
    const computedStyle = getComputedStyle(menuButton!);

    expect(menuButton).not.toBeNull();
    expect(['', 'none']).toContain(computedStyle.boxShadow);
  });

  it('uses dark theme styling for the tab bar menu button when dark theme is active', () => {
    fixture.componentRef.setInput('theme', 'dark');
    fixture.componentRef.setInput('showTabBarMenuButton', true);
    fixture.detectChanges();

    const menuButton = fixture.nativeElement.querySelector('.ribbon-tabs-menu-button') as HTMLElement | null;
    const computedStyle = getComputedStyle(menuButton!);

    expect(menuButton).not.toBeNull();
    expect(computedStyle.color).toBe('rgb(201, 206, 216)');
    expect(computedStyle.backgroundColor).toBe('rgba(49, 52, 58, 0.92)');
  });

  it('uses a raised shadow for the tab bar menu button in dark theme', () => {
    fixture.componentRef.setInput('theme', 'dark');
    fixture.componentRef.setInput('showTabBarMenuButton', true);
    fixture.detectChanges();

    const menuButton = fixture.nativeElement.querySelector('.ribbon-tabs-menu-button') as HTMLElement | null;
    const computedStyle = getComputedStyle(menuButton!);

    expect(menuButton).not.toBeNull();
    expect(computedStyle.boxShadow).not.toContain('inset');
    expect(computedStyle.boxShadow).toContain('rgba(0, 0, 0, 0.12)');
  });

  it('clips the tabs content area when the tab bar menu button is enabled', () => {
    fixture.componentRef.setInput('showTabBarMenuButton', true);
    fixture.detectChanges();

    const tabsContent = fixture.nativeElement.querySelector('.ribbon-tabs-content') as HTMLElement | null;

    expect(tabsContent).not.toBeNull();
    expect(getComputedStyle(tabsContent!).overflow).toBe('hidden');
  });

  it('renders a gradient mask before the tab bar menu button when enabled', () => {
    fixture.componentRef.setInput('showTabBarMenuButton', true);
    fixture.detectChanges();

    const menuMask = fixture.nativeElement.querySelector('.ribbon-tabs-menu-mask') as HTMLElement | null;
    expect(menuMask).not.toBeNull();
  });

  it('renders a leading gradient mask when tabs are scrolled and the menu button is enabled', () => {
    fixture.componentRef.setInput('showTabBarMenuButton', true);
    fixture.detectChanges();

    (
      component as unknown as {
        scrollOffset: { set: (value: number) => void };
      }
    ).scrollOffset.set(32);
    fixture.detectChanges();

    const leadingMask = fixture.nativeElement.querySelector('.ribbon-tabs-leading-mask') as HTMLElement | null;
    expect(leadingMask).not.toBeNull();
  });

  it('does not render the tab bar menu button in compact mode', () => {
    fixture.componentRef.setInput('mode', 'compact');
    fixture.detectChanges();

    const menuButton = fixture.nativeElement.querySelector('.ribbon-tabs-menu-button') as HTMLElement | null;
    expect(menuButton).toBeNull();
  });

  it('emits a tab bar menu click event when the button is pressed', () => {
    fixture.componentRef.setInput('showTabBarMenuButton', true);
    fixture.detectChanges();

    const emitSpy = vi.spyOn(component.tabBarMenuClick, 'emit');
    const menuButton = fixture.nativeElement.querySelector('.ribbon-tabs-menu-button') as HTMLButtonElement | null;

    expect(menuButton).not.toBeNull();

    menuButton?.click();
    fixture.detectChanges();

    expect(emitSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        origin: 'ui',
        hasTemplate: false,
        isOpen: false,
        activeTabId: '1',
      }),
    );
  });

  it('applies compact mode at the component level', () => {
    fixture.componentRef.setInput('mode', 'compact');
    fixture.detectChanges();

    const tabsRoot = fixture.nativeElement.querySelector('.ribbon-tabs') as HTMLElement | null;
    expect(tabsRoot?.classList.contains('ribbon-tabs--compact')).toBe(true);
  });

  it('shows the close button only on the active tab in compact mode', () => {
    fixture.componentRef.setInput('mode', 'compact');
    fixture.componentRef.setInput('tabs', [
      { id: '1', title: 'Report.pdf' },
      { id: '2', title: 'Appendix.pdf' },
    ]);
    fixture.detectChanges();

    const tabElements = Array.from(fixture.nativeElement.querySelectorAll('.ribbon-tab'));
    const firstTab = tabElements[0] as HTMLElement;
    const secondTab = tabElements[1] as HTMLElement;

    expect(firstTab.querySelector('.ribbon-tab-close')).not.toBeNull();
    expect(secondTab.querySelector('.ribbon-tab-close')).toBeNull();
  });

  it('allows compact tabs to explicitly disable the default close button', () => {
    fixture.componentRef.setInput('mode', 'compact');
    fixture.componentRef.setInput('tabs', [
      { id: '1', title: 'Report.pdf', showCloseButton: false },
      { id: '2', title: 'Appendix.pdf' },
    ]);
    fixture.detectChanges();

    const tabElements = Array.from(fixture.nativeElement.querySelectorAll('.ribbon-tab'));
    const firstTab = tabElements[0] as HTMLElement;
    const secondTab = tabElements[1] as HTMLElement;

    expect(firstTab.querySelector('.ribbon-tab-close')).toBeNull();
    expect(secondTab.querySelector('.ribbon-tab-close')).toBeNull();
  });

  it('uses ellipsis title behavior and a capped width in compact mode', () => {
    fixture.componentRef.setInput('mode', 'compact');
    fixture.componentRef.setInput('tabs', [
      {
        id: '1',
        title:
          'Quarterly Financial Reader Snapshot Final Version 2026-04-21 Internal Review Document.pdf',
      },
    ]);
    fixture.detectChanges();

    const tabElement = fixture.nativeElement.querySelector('.ribbon-tab') as HTMLElement | null;
    const titleElement = fixture.nativeElement.querySelector('.ribbon-tab-title') as HTMLElement | null;
    const width = Number.parseFloat(tabElement?.style.width ?? '0');

    expect(width).toBeLessThan(250);
    expect(getComputedStyle(titleElement!).textOverflow).toBe('ellipsis');
  });

  it('keeps inactive compact tabs visually merged into the tab strip', () => {
    fixture.componentRef.setInput('mode', 'compact');
    fixture.componentRef.setInput('tabs', [
      { id: '1', title: 'Report.pdf' },
      { id: '2', title: 'Appendix.pdf' },
    ]);
    fixture.detectChanges();

    const tabElements = Array.from(fixture.nativeElement.querySelectorAll('.ribbon-tab'));
    const activeTab = tabElements[0] as HTMLElement;
    const inactiveTab = tabElements[1] as HTMLElement;
    const activeBackground = activeTab.querySelector('.ribbon-tab-background') as HTMLElement | null;
    const inactiveBackground = inactiveTab.querySelector('.ribbon-tab-background') as HTMLElement | null;

    expect(getComputedStyle(activeBackground!).opacity).toBe('1');
    expect(getComputedStyle(inactiveBackground!).opacity).toBe('0');
  });

  it('uses stronger title contrast between active and inactive compact tabs', () => {
    fixture.componentRef.setInput('mode', 'compact');
    fixture.componentRef.setInput('tabs', [
      { id: '1', title: 'Report.pdf' },
      { id: '2', title: 'Appendix.pdf' },
    ]);
    fixture.detectChanges();

    const tabElements = Array.from(fixture.nativeElement.querySelectorAll('.ribbon-tab')) as HTMLElement[];
    const activeTab = tabElements[0] as HTMLElement;
    const inactiveTab = tabElements[1] as HTMLElement;
    const activeTitle = activeTab.querySelector('.ribbon-tab-title') as HTMLElement | null;
    const inactiveTitle = inactiveTab.querySelector('.ribbon-tab-title') as HTMLElement | null;

    expect(activeTitle).not.toBeNull();
    expect(inactiveTitle).not.toBeNull();
    expect(getComputedStyle(activeTitle!).color).toBe('rgb(36, 53, 74)');
    expect(getComputedStyle(inactiveTitle!).color).toBe('rgb(124, 134, 151)');
  });

  it('renders a full hover overlay for inactive compact tabs', () => {
    fixture.componentRef.setInput('mode', 'compact');
    fixture.componentRef.setInput('tabs', [
      { id: '1', title: 'Report.pdf' },
      { id: '2', title: 'Appendix.pdf' },
    ]);
    fixture.detectChanges();

    const tabElements = Array.from(fixture.nativeElement.querySelectorAll('.ribbon-tab')) as HTMLElement[];
    const inactiveTab = tabElements[1] as HTMLElement;

    expect(inactiveTab.querySelector('.ribbon-tab-hover-overlay')).not.toBeNull();
  });

  it('lays out compact tabs with slight overlap between neighbors', () => {
    fixture.componentRef.setInput('mode', 'compact');
    fixture.componentRef.setInput('tabs', [
      { id: '1', title: 'Report.pdf' },
      { id: '2', title: 'Appendix.pdf' },
      { id: '3', title: 'Notes.docx' },
    ]);
    fixture.detectChanges();

    const tabElements = Array.from(fixture.nativeElement.querySelectorAll('.ribbon-tab')) as HTMLElement[];
    const firstWidth = Number.parseFloat(tabElements[0]?.style.width ?? '0');
    const firstX = Number.parseFloat(
      tabElements[0]?.style.transform.match(/translate3d\(([-\d.]+)px/)?.[1] ?? '0',
    );
    const secondX = Number.parseFloat(
      tabElements[1]?.style.transform.match(/translate3d\(([-\d.]+)px/)?.[1] ?? '0',
    );

    expect(secondX).toBeLessThan(firstX + firstWidth);
    expect(secondX).toBeGreaterThan(firstX + firstWidth - 16);
  });

  it('keeps the compact active tab visually fused with the content area', () => {
    fixture.componentRef.setInput('mode', 'compact');
    fixture.detectChanges();

    const bottomBar = fixture.nativeElement.querySelector('.ribbon-tabs-bottom-bar') as HTMLElement | null;
    const content = fixture.nativeElement.querySelector('.rhc-ribbon-layout-content') as HTMLElement | null;

    expect(bottomBar).not.toBeNull();
    expect(getComputedStyle(bottomBar!).display).not.toBe('none');
    expect(getComputedStyle(content!).borderTopWidth).toBe('0px');
  });

  it('emits create lifecycle events and notifies registered create listeners', () => {
    const tabCreateSpy = vi.spyOn(component.tabCreate, 'emit');
    const tabEventSpy = vi.spyOn(component.tabEvent, 'emit');
    const createListener = vi.fn();

    const unsubscribe = component.addEventListener('create', createListener);
    const nextTab = new RHCRibbonLayoutTab({
      id: '3',
      title: 'Created Tab',
    });

    component.addTab(nextTab, { activate: false });

    expect(tabCreateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'create',
        origin: 'api',
        tab: expect.objectContaining({ id: '3', title: 'Created Tab' }),
        index: 2,
      }),
    );
    expect(tabEventSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'create',
        tab: expect.objectContaining({ id: '3' }),
      }),
    );
    expect(createListener).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'create',
        tab: expect.objectContaining({ id: '3' }),
      }),
    );

    unsubscribe();
  });

  it('emits select lifecycle events with previous selection data', () => {
    const tabSelectSpy = vi.spyOn(component.tabSelect, 'emit');
    const tabEventSpy = vi.spyOn(component.tabEvent, 'emit');
    const anyListener = vi.fn();

    const unsubscribe = component.addEventListener('*', anyListener);
    component.setActiveTab('2');

    expect(tabSelectSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'select',
        origin: 'api',
        tab: expect.objectContaining({ id: '2' }),
        previousTab: expect.objectContaining({ id: '1' }),
        previousIndex: 0,
        index: 1,
      }),
    );
    expect(tabEventSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'select',
        tab: expect.objectContaining({ id: '2' }),
      }),
    );
    expect(anyListener).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'select',
        tab: expect.objectContaining({ id: '2' }),
      }),
    );

    unsubscribe();
  });

  it('switches the active tab when activeTabId input changes', () => {
    fixture.componentRef.setInput('activeTabId', '2');
    fixture.detectChanges();

    const tabElements = Array.from(fixture.nativeElement.querySelectorAll('.ribbon-tab'));
    const firstTab = tabElements[0] as HTMLElement;
    const secondTab = tabElements[1] as HTMLElement;

    expect(firstTab.hasAttribute('active')).toBe(false);
    expect(secondTab.hasAttribute('active')).toBe(true);
  });

  it('switches the active tab from activeTabId input in compact mode', () => {
    fixture.componentRef.setInput('mode', 'compact');
    fixture.componentRef.setInput('tabs', [
      { id: '1', title: 'Report.pdf' },
      { id: '2', title: 'Appendix.pdf' },
    ]);
    fixture.componentRef.setInput('activeTabId', '2');
    fixture.detectChanges();

    const tabElements = Array.from(fixture.nativeElement.querySelectorAll('.ribbon-tab'));
    const firstTab = tabElements[0] as HTMLElement;
    const secondTab = tabElements[1] as HTMLElement;

    expect(firstTab.hasAttribute('active')).toBe(false);
    expect(secondTab.hasAttribute('active')).toBe(true);
  });

  it('emits remove lifecycle events and supports listener unsubscription', () => {
    fixture.componentRef.setInput('tabs', [
      { id: '1', title: 'One' },
      { id: '2', title: 'Closable', showCloseButton: true },
    ]);
    fixture.componentRef.setInput('initialActiveTabId', '2');
    fixture.detectChanges();

    const tabRemoveSpy = vi.spyOn(component.tabRemove, 'emit');
    const listener = vi.fn();
    const unsubscribe = component.addEventListener('remove', listener);

    component.closeTab('2');

    expect(tabRemoveSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'remove',
        origin: 'api',
        tab: expect.objectContaining({ id: '2' }),
        index: 1,
        nextActiveTabId: '1',
      }),
    );
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    component.closeTab('1');
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('does not reorder tabs by dragging when tab reordering is disabled by default', () => {
    fixture.componentRef.setInput('tabs', [
      { id: '1', title: 'One' },
      { id: '2', title: 'Two' },
      { id: '3', title: 'Three' },
    ]);
    fixture.detectChanges();

    const emitSpy = vi.spyOn(component.tabReorder, 'emit');
    const tabElements = Array.from(fixture.nativeElement.querySelectorAll('.ribbon-tab')) as HTMLElement[];
    const firstTab = tabElements[0] as HTMLElement;
    const secondTab = tabElements[1] as HTMLElement;
    const firstTabContent = firstTab.querySelector('.ribbon-tab-content') as HTMLButtonElement | null;
    const moveDelta = parseTranslateX(secondTab) - parseTranslateX(firstTab) + 8;

    dispatchPointerEvent(firstTabContent, 'pointerdown', { clientX: 100, timeStamp: 0 });
    dispatchPointerEvent(firstTabContent, 'pointermove', { clientX: 100 + moveDelta, timeStamp: 16 });
    fixture.detectChanges();
    dispatchPointerEvent(firstTabContent, 'pointerup', { clientX: 100 + moveDelta, timeStamp: 32 });
    fixture.detectChanges();

    const titles = Array.from(fixture.nativeElement.querySelectorAll('.ribbon-tab-title')).map((element) =>
      (element as HTMLElement).textContent?.trim(),
    );

    expect(emitSpy).not.toHaveBeenCalled();
    expect(titles).toEqual(['One', 'Two', 'Three']);
  });

  it('reorders tabs when dragging a tab past the next slot after explicitly enabling tab reordering', () => {
    fixture.componentRef.setInput('enableTabReorder', true);
    fixture.componentRef.setInput('tabs', [
      { id: '1', title: 'One' },
      { id: '2', title: 'Two' },
      { id: '3', title: 'Three' },
    ]);
    fixture.detectChanges();

    const emitSpy = vi.spyOn(component.tabReorder, 'emit');
    const tabElements = Array.from(fixture.nativeElement.querySelectorAll('.ribbon-tab')) as HTMLElement[];
    const firstTab = tabElements[0] as HTMLElement;
    const secondTab = tabElements[1] as HTMLElement;
    const firstTabContent = firstTab.querySelector('.ribbon-tab-content') as HTMLButtonElement | null;
    const moveDelta = parseTranslateX(secondTab) - parseTranslateX(firstTab) + 8;

    dispatchPointerEvent(firstTabContent, 'pointerdown', { clientX: 100, timeStamp: 0 });
    dispatchPointerEvent(firstTabContent, 'pointermove', { clientX: 100 + moveDelta, timeStamp: 16 });
    fixture.detectChanges();
    dispatchPointerEvent(firstTabContent, 'pointerup', { clientX: 100 + moveDelta, timeStamp: 32 });
    fixture.detectChanges();

    const titles = Array.from(fixture.nativeElement.querySelectorAll('.ribbon-tab-title')).map((element) =>
      (element as HTMLElement).textContent?.trim(),
    );

    expect(emitSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        tab: expect.objectContaining({ id: '1' }),
        previousIndex: 0,
        currentIndex: 1,
      }),
    );
    expect(titles).toEqual(['Two', 'One', 'Three']);
  });

  it('reorders compact tabs when dragging a tab past the next slot after explicitly enabling tab reordering', () => {
    fixture.componentRef.setInput('enableTabReorder', true);
    fixture.componentRef.setInput('mode', 'compact');
    fixture.componentRef.setInput('tabs', [
      { id: '1', title: 'Report.pdf' },
      { id: '2', title: 'Appendix.pdf' },
      { id: '3', title: 'Notes.pdf' },
    ]);
    fixture.detectChanges();

    const emitSpy = vi.spyOn(component.tabReorder, 'emit');
    const tabElements = Array.from(fixture.nativeElement.querySelectorAll('.ribbon-tab')) as HTMLElement[];
    const firstTab = tabElements[0] as HTMLElement;
    const secondTab = tabElements[1] as HTMLElement;
    const firstTabContent = firstTab.querySelector('.ribbon-tab-content') as HTMLButtonElement | null;
    const moveDelta = parseTranslateX(secondTab) - parseTranslateX(firstTab) + 8;

    dispatchPointerEvent(firstTabContent, 'pointerdown', { clientX: 120, timeStamp: 0 });
    dispatchPointerEvent(firstTabContent, 'pointermove', { clientX: 120 + moveDelta, timeStamp: 16 });
    fixture.detectChanges();
    dispatchPointerEvent(firstTabContent, 'pointerup', { clientX: 120 + moveDelta, timeStamp: 32 });
    fixture.detectChanges();

    const titles = Array.from(fixture.nativeElement.querySelectorAll('.ribbon-tab-title')).map((element) =>
      (element as HTMLElement).textContent?.trim(),
    );

    expect(emitSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        tab: expect.objectContaining({ id: '1' }),
        previousIndex: 0,
        currentIndex: 1,
      }),
    );
    expect(titles).toEqual(['Appendix.pdf', 'Report.pdf', 'Notes.pdf']);
  });

  it('does not start tab reordering from the close button', () => {
    fixture.componentRef.setInput('enableTabReorder', true);
    fixture.componentRef.setInput('tabs', [
      { id: '1', title: 'One', showCloseButton: true },
      { id: '2', title: 'Two' },
    ]);
    fixture.detectChanges();

    const emitSpy = vi.spyOn(component.tabReorder, 'emit');
    const closeButton = fixture.nativeElement.querySelector('.ribbon-tab-close') as HTMLElement | null;

    dispatchPointerEvent(closeButton, 'pointerdown', { clientX: 100, timeStamp: 0 });
    dispatchPointerEvent(closeButton, 'pointermove', { clientX: 180, timeStamp: 16 });
    dispatchPointerEvent(closeButton, 'pointerup', { clientX: 180, timeStamp: 32 });
    fixture.detectChanges();

    expect(emitSpy).not.toHaveBeenCalled();
  });
});

describe('RHCRibbonLayoutComponent tab bar menu overlay', () => {
  let fixture: ComponentFixture<RibbonLayoutTabBarMenuHostComponent>;
  let host: RibbonLayoutTabBarMenuHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RibbonLayoutTabBarMenuHostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(RibbonLayoutTabBarMenuHostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders the external menu template in an overlay when the menu button is clicked', () => {
    const menuButton = fixture.nativeElement.querySelector('.ribbon-tabs-menu-button') as HTMLButtonElement | null;

    menuButton?.click();
    fixture.detectChanges();

    const overlayMenu = document.body.querySelector('.ribbon-tabs-menu-overlay') as HTMLElement | null;

    expect(host.menuClicks).toHaveLength(1);
    expect(overlayMenu).not.toBeNull();
    expect(overlayMenu?.textContent).toContain('Close');
  });

  it('keeps the menu button in an open visual state while the overlay is visible', () => {
    const menuButton = fixture.nativeElement.querySelector('.ribbon-tabs-menu-button') as HTMLButtonElement | null;

    expect(menuButton).not.toBeNull();
    expect(menuButton?.classList.contains('ribbon-tabs-menu-button--open')).toBe(false);

    menuButton?.click();
    fixture.detectChanges();

    expect(menuButton?.classList.contains('ribbon-tabs-menu-button--open')).toBe(true);

    const closeButton = document.body.querySelector('.test-tab-bar-menu-close') as HTMLButtonElement | null;
    closeButton?.click();
    fixture.detectChanges();

    expect(menuButton?.classList.contains('ribbon-tabs-menu-button--open')).toBe(false);
  });

  it('closes the overlay when the template context close callback is used', () => {
    const menuButton = fixture.nativeElement.querySelector('.ribbon-tabs-menu-button') as HTMLButtonElement | null;

    menuButton?.click();
    fixture.detectChanges();

    const closeButton = document.body.querySelector('.test-tab-bar-menu-close') as HTMLButtonElement | null;
    closeButton?.click();
    fixture.detectChanges();

    const overlayMenu = document.body.querySelector('.ribbon-tabs-menu-overlay') as HTMLElement | null;
    expect(overlayMenu).toBeNull();
  });
});
