import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { RHCRibbonLayoutComponent, RHCRibbonLayoutTab } from './rhc-ribbon-layout';

const TAB_WITH_ICON =
  'data:image/svg+xml;utf8,%3Csvg xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22 width%3D%2216%22 height%3D%2216%22%3E%3Crect width%3D%2216%22 height%3D%2216%22 fill%3D%22%23000%22%2F%3E%3C%2Fsvg%3E';

describe('RHCRibbonLayoutComponent', () => {
  let component: RHCRibbonLayoutComponent;
  let fixture: ComponentFixture<RHCRibbonLayoutComponent>;

  beforeAll(() => {
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
    const tabElements = Array.from(fixture.nativeElement.querySelectorAll('.ribbon-tab'));
    const titleOnlyTab = tabElements[0] as HTMLElement;
    const titledTabContent = titleOnlyTab.querySelector('.ribbon-tab-content');

    expect(titleOnlyTab.classList.contains('ribbon-tab--has-favicon')).toBe(false);
    expect(titleOnlyTab.querySelector('.ribbon-tab-favicon')).toBeNull();
    expect(titledTabContent?.classList.contains('ribbon-tab-content--title-only')).toBe(true);
  });

  it('renders the favicon element when favicon is provided', () => {
    const tabElements = Array.from(fixture.nativeElement.querySelectorAll('.ribbon-tab'));
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

  it('applies compact mode at the component level', () => {
    fixture.componentRef.setInput('mode', 'compact');
    fixture.detectChanges();

    const tabsRoot = fixture.nativeElement.querySelector('.ribbon-tabs') as HTMLElement | null;
    expect(tabsRoot?.classList.contains('ribbon-tabs--compact')).toBe(true);
  });

  it('shows close buttons by default in compact mode', () => {
    fixture.componentRef.setInput('mode', 'compact');
    fixture.componentRef.setInput('tabs', [
      { id: '1', title: 'Report.pdf' },
      { id: '2', title: 'Appendix.pdf' },
    ]);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.ribbon-tab-close').length).toBe(2);
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
    expect(secondTab.querySelector('.ribbon-tab-close')).not.toBeNull();
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

  it('lays out compact tabs without overlap between neighbors', () => {
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

    expect(secondX).toBeGreaterThanOrEqual(firstX + firstWidth);
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
});
