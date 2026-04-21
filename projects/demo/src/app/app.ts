import { AfterViewInit, Component, TemplateRef, ViewChild, computed, signal } from '@angular/core';
import {
  RHCRibbonLayoutComponent,
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
  protected readonly theme = signal<RHCRibbonTabTheme>('light');
  protected readonly showIcons = signal(true);
  protected readonly tabs = signal<RHCRibbonLayoutTab[]>([]);
  protected readonly activeTabId = signal<string | null>('facebook');
  protected readonly activeTitle = computed(
    () => this.tabs().find((tab) => tab.id === this.activeTabId())?.title ?? 'None',
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
    const labelIndex = this.tabs().length + 1;
    const nextTab = this.createTab({
      id: `tab-${labelIndex}`,
      title: `Preview ${labelIndex}`,
      favicon: createFavicon('#7b61ff', String(labelIndex).slice(-1)),
      contentTemplate: this.previewTemplate ?? null,
      contentContext: {
        heading: `Preview ${labelIndex}`,
        description: 'This tab body is rendered by RHCRibbonLayoutComponent via ngTemplateOutlet.',
      },
    });

    this.ribbonLayout?.addTab(nextTab);
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

  protected handleActiveTabChange(tabId: string | null): void {
    this.activeTabId.set(tabId);
  }

  protected handleTabsChange(tabs: RHCRibbonLayoutTab[]): void {
    this.tabs.set(this.applyIconVisibility(tabs));
  }

  private createTab<TContext>(config: {
    id: string;
    title: string;
    favicon?: string | null;
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
}
