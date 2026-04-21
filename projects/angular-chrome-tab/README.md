# AngularChromeTab

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 21.2.0.

## Usage

`RHCRibbonLayoutComponent` supports controlled tab selection through the
`activeTabId` input. The external caller owns the current tab id and updates it
from the `tabSelect` event.

```ts
import { Component, TemplateRef, ViewChild, signal } from '@angular/core';
import {
  RHCRibbonLayoutComponent,
  RHCRibbonLayoutSelectEvent,
  RHCRibbonLayoutTab,
  RHCRibbonLayoutTabContentContext,
} from 'angular-chrome-tab';

@Component({
  selector: 'app-example',
  imports: [RHCRibbonLayoutComponent],
  template: `
    <rhc-ribbon-layout
      [tabs]="tabs()"
      [activeTabId]="activeTabId()"
      (tabSelect)="handleTabSelect($event)"
      (tabsChange)="tabs.set($event)"
    />

    <button type="button" (click)="activeTabId.set('tab-2')">
      Switch To Tab 2
    </button>

    <ng-template #tabContent let-data>
      <section>{{ data }}</section>
    </ng-template>
  `,
})
export class ExampleComponent {
  protected readonly activeTabId = signal<string | null>('tab-1');
  protected readonly tabs = signal<RHCRibbonLayoutTab[]>([]);

  @ViewChild('tabContent', { static: true })
  private readonly tabContent?: TemplateRef<RHCRibbonLayoutTabContentContext<string>>;

  ngAfterViewInit(): void {
    this.tabs.set([
      new RHCRibbonLayoutTab({
        id: 'tab-1',
        title: 'Overview',
        contentTemplate: this.tabContent ?? null,
        contentContext: 'Overview content',
      }),
      new RHCRibbonLayoutTab({
        id: 'tab-2',
        title: 'Details',
        showCloseButton: true,
        contentTemplate: this.tabContent ?? null,
        contentContext: 'Details content',
      }),
    ]);
  }

  protected handleTabSelect(event: RHCRibbonLayoutSelectEvent): void {
    this.activeTabId.set(event.tab?.id ?? null);
  }
}
```

### Events

- `tabCreate`: emitted when a tab is created.
- `tabRemove`: emitted when a tab is removed.
- `tabSelect`: emitted when the active tab changes.
- `tabEvent`: unified event stream for `create`, `remove`, and `select`.
- `tabsChange`: emitted with the full latest tab array.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the library, run:

```bash
ng build angular-chrome-tab
```

This command will compile your project, and the build artifacts will be placed in the `dist/` directory.

### Publishing the Library

Once the project is built, you can publish your library by following these steps:

1. Navigate to the `dist` directory:

   ```bash
   cd dist/angular-chrome-tab
   ```

2. Run the `npm publish` command to publish your library to the npm registry:
   ```bash
   npm publish
   ```

## Running unit tests

To execute unit tests with the [Karma](https://karma-runner.github.io) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
