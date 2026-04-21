import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { RHCRibbonLayoutComponent } from './rhc-ribbon-layout';

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

  it('emits tabClose and removes the tab when its close button is clicked', () => {
    fixture.componentRef.setInput('tabs', [
      { id: '1', title: 'One' },
      { id: '2', title: 'Closable', showCloseButton: true },
    ]);
    fixture.componentRef.setInput('initialActiveTabId', '2');
    fixture.detectChanges();

    const emitSpy = vi.spyOn(component.tabClose, 'emit');
    const closeButton = fixture.nativeElement.querySelector('.ribbon-tab-close') as HTMLElement | null;

    expect(closeButton).not.toBeNull();

    closeButton?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    fixture.detectChanges();

    expect(emitSpy).toHaveBeenCalledWith({
      tab: expect.objectContaining({ id: '2', title: 'Closable', showCloseButton: true }),
      index: 1,
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
});
