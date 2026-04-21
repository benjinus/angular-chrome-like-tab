import { AfterViewInit, Component, TemplateRef, ViewChild, computed, signal } from '@angular/core';
import {
  RHCRibbonLayoutComponent,
  RHCRibbonLayoutCreateEvent,
  RHCRibbonLayoutEvent,
  RHCRibbonLayoutTabBarMenuClickEvent,
  RHCRibbonLayoutTabBarMenuContext,
  RHCRibbonLayoutRemoveEvent,
  RHCRibbonLayoutSelectEvent,
  RHCRibbonLayoutTab,
  RHCRibbonLayoutTabContentContext,
  RHCRibbonTabTheme,
} from 'angular-chrome-tab';

function createFavicon(bg: string, label: string): string {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
      <rect width="16" height="16" rx="4" fill="${bg}"/>
      <text x="8" y="11" text-anchor="middle" font-size="9" font-family="Arial, sans-serif" fill="#ffffff">${label}</text>
    </svg>
  `;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

@Component({
  selector: 'app-root',
  imports: [RHCRibbonLayoutComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements AfterViewInit {
  protected readonly eventLog = signal<string[]>([]);
  protected readonly theme = signal<RHCRibbonTabTheme>('light');
  protected readonly showIcons = signal(true);
  protected readonly tabs = signal<RHCRibbonLayoutTab[]>([]);
  protected readonly activeTabId = signal<string | null>('facebook');
  protected readonly compactTabs = signal<RHCRibbonLayoutTab[]>([]);
  protected readonly compactActiveTabId = signal<string | null>('reader-main');
  protected readonly activeTitle = computed(
    () => this.tabs().find((tab) => tab.id === this.activeTabId())?.title ?? 'None',
  );
  protected readonly compactActiveTitle = computed(
    () => this.compactTabs().find((tab) => tab.id === this.compactActiveTabId())?.title ?? 'None',
  );
  private readonly tabIcons = new Map<string, string>();

  @ViewChild(RHCRibbonLayoutComponent)
  private readonly ribbonLayout?: RHCRibbonLayoutComponent;

  @ViewChild('workspaceTemplate', { static: true })
  private readonly workspaceTemplate?: TemplateRef<RHCRibbonLayoutTabContentContext<{
    heading: string;
    description: string;
    stats: string[];
  }>>;

  @ViewChild('inboxTemplate', { static: true })
  private readonly inboxTemplate?: TemplateRef<RHCRibbonLayoutTabContentContext<{
    heading: string;
    mails: string[];
  }>>;

  @ViewChild('dashboardTemplate', { static: true })
  private readonly dashboardTemplate?: TemplateRef<RHCRibbonLayoutTabContentContext<{
    heading: string;
    metrics: Array<{ label: string; value: string }>;
  }>>;

  @ViewChild('previewTemplate', { static: true })
  private readonly previewTemplate?: TemplateRef<RHCRibbonLayoutTabContentContext<{
    heading: string;
    description: string;
  }>>;

  @ViewChild('tabBarMenuTemplate', { static: true })
  protected readonly tabBarMenuTemplateRef?: TemplateRef<RHCRibbonLayoutTabBarMenuContext>;

  ngAfterViewInit(): void {
    this.tabs.set([
      this.createTab({
        id: 'google',
        title: 'Workspace',
        favicon: createFavicon('#4285f4', 'W'),
        contentTemplate: this.workspaceTemplate ?? null,
        contentContext: {
          heading: 'Workspace Overview',
          description: 'Assemble rich tab content directly inside RHCRibbonLayoutComponent.',
          stats: ['8 open docs', '3 shared drafts', '12 annotations'],
        },
      }),
      this.createTab({
        id: 'facebook',
        title: 'Inbox',
        favicon: createFavicon('#1877f2', 'I'),
        contentTemplate: this.inboxTemplate ?? null,
        contentContext: {
          heading: 'Priority Inbox',
          mails: ['Review ribbon layout API', 'Sync mobile fling behavior', 'Prepare release notes'],
        },
      }),
      this.createTab({
        id: 'github',
        title: 'Dashboard',
        favicon: createFavicon('#24292f', 'D'),
        contentTemplate: this.dashboardTemplate ?? null,
        contentContext: {
          heading: 'Delivery Dashboard',
          metrics: [
            { label: 'Build', value: 'Passing' },
            { label: 'Coverage', value: '92%' },
            { label: 'Review', value: '2 pending' },
          ],
        },
      }),
      this.createTab({
        id: 'docs',
        title: 'Angular Docs',
        favicon: createFavicon('#dd0031', 'A'),
        contentTemplate: this.previewTemplate ?? null,
        contentContext: {
          heading: 'Angular Integration Notes',
          description: 'Use ng-template content to render each tab body inside the ribbon layout.',
        },
      }),
    ]);

    this.compactTabs.set([
      this.createTab({
        id: 'reader-main',
        title: '2026 Annual Reader Report.pdf',
        favicon: createFavicon('#0f766e', 'P'),
        contentTemplate: this.previewTemplate ?? null,
        contentContext: {
          heading: 'Primary Reader File',
          description: 'Compact mode keeps file tabs dense and predictable for document switching.',
        },
      }),
      this.createTab({
        id: 'reader-appendix',
        title: 'Appendix-Financial-Models-Internal-Review.xlsx',
        favicon: createFavicon('#1d6f42', 'X'),
        contentTemplate: this.previewTemplate ?? null,
        contentContext: {
          heading: 'Appendix Workbook',
          description: 'Long file names are capped and truncated in compact mode.',
        },
      }),
      this.createTab({
        id: 'reader-notes',
        title: 'Reviewer Notes.docx',
        favicon: createFavicon('#2563eb', 'W'),
        contentTemplate: this.previewTemplate ?? null,
        contentContext: {
          heading: 'Review Notes',
          description: 'Close buttons stay available by default for file-style tabs.',
        },
      }),
    ]);
  }

  protected setActiveTab(tabId: string): void {
    this.ribbonLayout?.setActiveTab(tabId);
  }

  protected toggleTheme(): void {
    this.theme.update((theme) => (theme === 'light' ? 'dark' : 'light'));
  }

  protected toggleIcons(): void {
    this.showIcons.update((showIcons) => !showIcons);
    this.tabs.update((tabs) => this.applyIconVisibility(tabs));
  }

  protected addTab(): void {
    this.ribbonLayout?.addTab(this.buildPreviewTab());
  }

  protected addClosableTab(): void {
    this.ribbonLayout?.addTab(
      this.buildPreviewTab({
        showCloseButton: true,
      }),
    );
  }

  protected closeActiveTab(): void {
    const activeTabId = this.activeTabId();
    if (!activeTabId) {
      return;
    }

    this.ribbonLayout?.closeTab(activeTabId);
  }

  protected moveActiveTabLeft(): void {
    const activeTabId = this.activeTabId();
    const activeIndex = this.tabs().findIndex((tab) => tab.id === activeTabId);
    if (!activeTabId || activeIndex <= 0) {
      return;
    }

    this.ribbonLayout?.reorderTab(activeTabId, activeIndex - 1);
  }

  protected moveActiveTabRight(): void {
    const activeTabId = this.activeTabId();
    const activeIndex = this.tabs().findIndex((tab) => tab.id === activeTabId);
    if (!activeTabId || activeIndex < 0 || activeIndex >= this.tabs().length - 1) {
      return;
    }

    this.ribbonLayout?.reorderTab(activeTabId, activeIndex + 1);
  }

  protected handleTabSelect(event: RHCRibbonLayoutSelectEvent): void {
    this.activeTabId.set(event.tab?.id ?? null);
    this.pushEventLog(
      `tabSelect · ${event.origin} · ${event.previousTab?.title ?? 'None'} -> ${event.tab?.title ?? 'None'}`,
    );
  }

  protected handleTabCreate(event: RHCRibbonLayoutCreateEvent): void {
    this.pushEventLog(
      `tabCreate · ${event.origin} · ${event.tab.title} @ ${event.index}${event.activated ? ' · activated' : ''}`,
    );
  }

  protected handleTabRemove(event: RHCRibbonLayoutRemoveEvent): void {
    this.pushEventLog(
      `tabRemove · ${event.origin} · ${event.tab.title} · next ${event.nextActiveTabId ?? 'None'}`,
    );
  }

  protected handleTabEvent(event: RHCRibbonLayoutEvent): void {
    this.pushEventLog(`tabEvent · ${event.type} · ${event.origin}`);
  }

  protected handleTabBarMenuClick(event: RHCRibbonLayoutTabBarMenuClickEvent): void {
    this.pushEventLog(
      `tabBarMenuClick · ${event.origin} · ${event.hasTemplate ? 'template' : 'callback'} · open ${event.isOpen}`,
    );
  }

  protected handleTabsChange(tabs: RHCRibbonLayoutTab[]): void {
    this.tabs.set(this.applyIconVisibility(tabs));
  }

  protected handleCompactTabSelect(event: RHCRibbonLayoutSelectEvent): void {
    this.compactActiveTabId.set(event.tab?.id ?? null);
  }

  protected handleCompactTabsChange(tabs: RHCRibbonLayoutTab[]): void {
    this.compactTabs.set(this.applyIconVisibility(tabs));
  }

  protected setCompactActiveTab(tabId: string): void {
    this.compactActiveTabId.set(tabId);
  }

  private createTab<TContext>(config: {
    id: string;
    title: string;
    favicon?: string | null;
    showCloseButton?: boolean;
    contentTemplate?: RHCRibbonLayoutTab<TContext>['contentTemplate'];
    contentContext?: TContext | null;
    contentContainerClass?: string;
  }): RHCRibbonLayoutTab<TContext> {
    if (config.favicon) {
      this.tabIcons.set(config.id, config.favicon);
    }

    return new RHCRibbonLayoutTab({
      ...config,
      favicon: this.showIcons() ? config.favicon ?? null : null,
    });
  }

  private applyIconVisibility(tabs: RHCRibbonLayoutTab[]): RHCRibbonLayoutTab[] {
    return tabs.map(
      (tab) =>
        new RHCRibbonLayoutTab({
          ...tab,
          favicon: this.showIcons() ? this.tabIcons.get(tab.id) ?? null : null,
        }),
    );
  }

  private buildPreviewTab(options?: {
    showCloseButton?: boolean;
  }): RHCRibbonLayoutTab<{
    heading: string;
    description: string;
  }> {
    const labelIndex = this.tabs().length + 1;

    return this.createTab({
      id: `tab-${labelIndex}`,
      title: `Preview ${labelIndex}`,
      favicon: createFavicon('#7b61ff', String(labelIndex).slice(-1)),
      showCloseButton: options?.showCloseButton ?? false,
      contentTemplate: this.previewTemplate ?? null,
      contentContext: {
        heading: `Preview ${labelIndex}`,
        description: 'This tab body is rendered by RHCRibbonLayoutComponent via ngTemplateOutlet.',
      },
    });
  }

  private pushEventLog(entry: string): void {
    this.eventLog.update((items) => [entry, ...items].slice(0, 12));
  }
}
