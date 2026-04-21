import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { App } from './app';

describe('App', () => {
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
      imports: [App],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render migrated library title', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('rhc-ribbon-layout');
  });

  it('should toggle tab icons in demo', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const toggleButton = Array.from(compiled.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('隐藏 icon'),
    ) as HTMLButtonElement | undefined;

    expect(toggleButton).toBeTruthy();
    expect(compiled.querySelectorAll('.ribbon-tab-favicon').length).toBeGreaterThan(0);

    toggleButton?.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(compiled.querySelectorAll('.ribbon-tab-favicon').length).toBe(0);
    expect(toggleButton?.textContent).toContain('显示 icon');

    toggleButton?.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(compiled.querySelectorAll('.ribbon-tab-favicon').length).toBeGreaterThan(0);
  });

  it('should add a closable tab from the demo toolbar', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const addClosableButton = Array.from(compiled.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('新增标签页带关闭按钮'),
    ) as HTMLButtonElement | undefined;
    const previousTabCount = compiled.querySelectorAll('.ribbon-tab').length;
    const previousCloseButtonCount = compiled.querySelectorAll('.ribbon-tab-close').length;

    expect(addClosableButton).toBeTruthy();

    addClosableButton?.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(compiled.querySelectorAll('.ribbon-tab').length).toBe(previousTabCount + 1);
    expect(compiled.querySelectorAll('.ribbon-tab-close').length).toBe(previousCloseButtonCount + 1);
  });

  it('should render a compact file tab example with default close buttons', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const compactCard = compiled.querySelector('.preview-card--compact-demo') as HTMLElement | null;

    expect(compactCard).not.toBeNull();
    expect(compactCard?.textContent).toContain('Compact File Tabs');
    expect(compactCard?.querySelectorAll('.ribbon-tab-close').length).toBeGreaterThan(0);
  });

  it('should render event log entries when tab events fire', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const addButton = Array.from(compiled.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('新增标签'),
    ) as HTMLButtonElement | undefined;

    expect(compiled.querySelectorAll('.event-log__item').length).toBeGreaterThan(0);

    addButton?.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const logText = compiled.querySelector('.event-log')?.textContent ?? '';
    expect(logText).toContain('tabCreate');
    expect(logText).toContain('tabEvent');
  });
});
