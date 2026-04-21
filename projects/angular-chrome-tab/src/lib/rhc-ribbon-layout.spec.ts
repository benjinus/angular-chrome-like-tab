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
});
