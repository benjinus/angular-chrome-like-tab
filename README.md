# Angular Chrome Like Tab

`angular-chrome-tab` 提供一个接近 Chrome 标签栏体验的 Angular 独立组件 `rhc-ribbon-layout`，支持：

- 受控 active tab
- 动态增删标签
- 可选 icon / close button
- `default` / `compact` 两种标签风格
- 可选内容区显示/隐藏
- 可选标签栏菜单按钮与 CDK overlay 菜单
- 可选拖拽排序，默认关闭

## 安装

```bash
npm install angular-chrome-tab
```

## 基本用法

```ts
import { Component, TemplateRef, ViewChild, signal } from '@angular/core';
import {
  RHCRibbonLayoutComponent,
  RHCRibbonLayoutSelectEvent,
  RHCRibbonLayoutTab,
  RHCRibbonLayoutTabContentContext,
} from 'angular-chrome-tab';

@Component({
  selector: 'app-root',
  imports: [RHCRibbonLayoutComponent],
  template: `
    <rhc-ribbon-layout
      #ribbonLayout
      [tabs]="tabs()"
      [activeTabId]="activeTabId()"
      [showContentArea]="true"
      [enableTabReorder]="true"
      (tabSelect)="handleTabSelect($event)"
      (tabsChange)="handleTabsChange($event)"
    />

    <ng-template #previewTemplate let-data let-tab="tab">
      <section>
        <h2>{{ tab?.title }}</h2>
        <p>{{ data.description }}</p>
      </section>
    </ng-template>
  `,
})
export class AppComponent {
  protected readonly tabs = signal<RHCRibbonLayoutTab[]>([]);
  protected readonly activeTabId = signal<string | null>('workspace');

  @ViewChild(RHCRibbonLayoutComponent)
  private readonly ribbonLayout?: RHCRibbonLayoutComponent;

  @ViewChild('previewTemplate', { static: true })
  private readonly previewTemplate?: TemplateRef<
    RHCRibbonLayoutTabContentContext<{ description: string }>
  >;

  ngAfterViewInit(): void {
    this.tabs.set([
      new RHCRibbonLayoutTab({
        id: 'workspace',
        title: 'Workspace',
        contentTemplate: this.previewTemplate ?? null,
        contentContext: {
          description: 'Controlled tab content rendered inside the ribbon layout.',
        },
      }),
      new RHCRibbonLayoutTab({
        id: 'inbox',
        title: 'Inbox',
        showCloseButton: true,
        contentTemplate: this.previewTemplate ?? null,
        contentContext: {
          description: 'Each tab can carry its own template context.',
        },
      }),
    ]);
  }

  protected handleTabSelect(event: RHCRibbonLayoutSelectEvent): void {
    this.activeTabId.set(event.tab?.id ?? null);
  }

  protected handleTabsChange(tabs: RHCRibbonLayoutTab[]): void {
    this.tabs.set(tabs);
  }

  protected addTab(): void {
    this.ribbonLayout?.addTab(
      new RHCRibbonLayoutTab({
        id: crypto.randomUUID(),
        title: 'New Tab',
        showCloseButton: true,
        contentTemplate: this.previewTemplate ?? null,
        contentContext: {
          description: 'New tabs can be appended programmatically.',
        },
      }),
    );
  }
}
```

## 受控接口

推荐把标签顺序和当前激活标签都放在外部状态里维护：

- `[tabs]` 作为输入源
- `[activeTabId]` 作为受控激活标签
- `(tabsChange)` 用于同步内部增删/重排后的新顺序
- `(tabSelect)` 用于同步当前激活标签

程序化操作可通过组件实例调用：

- `setActiveTab(tabId)`
- `addTab(tab, options?)`
- `closeTab(tabId)`
- `reorderTab(tabId, targetIndex)`

## 拖拽排序

拖拽排序默认关闭，必须显式启用：

```html
<rhc-ribbon-layout
  [tabs]="tabs()"
  [activeTabId]="activeTabId()"
  [enableTabReorder]="true"
  (tabsChange)="tabs.set($event)"
/>
```

说明：

- `enableTabReorder` 只控制“手势拖拽排序”是否可用
- 程序化 `reorderTab(tabId, targetIndex)` 始终可用
- 拖拽完成后组件会立即更新内部顺序，并通过 `tabsChange` 与 `tabReorder` 通知外部

## 仅显示标签栏

如果你只需要标签栏本身，不需要下方内容容器，可以关闭内容区：

```html
<rhc-ribbon-layout
  [tabs]="tabs()"
  [activeTabId]="activeTabId()"
  [showContentArea]="false"
  (tabSelect)="activeTabId.set($event.tab?.id ?? null)"
/>
```

说明：

- `showContentArea` 默认是 `true`
- 设为 `false` 后只隐藏组件内部内容区，不影响标签切换、事件输出、菜单按钮或程序化 API

## 常用输入与输出

常用输入：

- `[tabs]`
- `[activeTabId]`
- `[initialActiveTabId]`
- `[mode]="'default' | 'compact'"`
- `[theme]="'light' | 'dark'"`
- `[showContentArea]="boolean"`
- `[enableTabReorder]="boolean"`
- `[showTabBarMenuButton]="boolean"`
- `[tabBarMenuTemplate]="templateRef"`

常用输出：

- `(tabSelect)`
- `(tabCreate)`
- `(tabRemove)`
- `(tabReorder)`
- `(tabsChange)`
- `(tabBarMenuClick)`
- `(tabEvent)`

## 开发

启动 demo：

```bash
ng serve
```

构建库：

```bash
ng build angular-chrome-tab
```

运行测试：

```bash
ng test angular-chrome-tab
```
