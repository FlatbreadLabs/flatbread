import type { EditorContext } from '../commands/types.ts';
import type { ViewState } from '../persist/viewstate.ts';
import { fail } from '../util/assert.ts';
import type { FieldDescriptor, SectionDescriptor } from './schema.ts';
import { combine } from './mixed.ts';
import { formatFieldValue } from './fields.ts';
import type { CommitResult } from './commit.ts';
import { commitField } from './commit.ts';
import { layoutSection } from './sections/layout.ts';
import { fillSection } from './sections/fill.ts';
import { strokeSection } from './sections/stroke.ts';
import { textSection } from './sections/text.ts';
import { appearanceSection } from './sections/appearance.ts';

export interface FieldView {
  label: string;
  value: string;
  mixed: boolean;
  readonly: boolean;
}

export interface SectionView {
  name: string;
  title: string;
  collapsed: boolean;
  fields: FieldView[];
}

export interface PanelView {
  /** How many nodes the panel is showing. */
  count: number;
  sections: SectionView[];
}

export const DEFAULT_SECTIONS: readonly SectionDescriptor[] = [
  layoutSection,
  appearanceSection,
  fillSection,
  strokeSection,
  textSection,
];

/**
 * The properties panel for the current selection. A section shows when at
 * least one of its fields applies to a selected node; a field shows the
 * shared value of the nodes it applies to, or Mixed.
 */
export class PropertiesPanel {
  private ctx: EditorContext;
  private sections: SectionDescriptor[];
  private viewState: () => ViewState;

  constructor(
    ctx: EditorContext,
    viewState: () => ViewState,
    sections: readonly SectionDescriptor[] = DEFAULT_SECTIONS
  ) {
    this.ctx = ctx;
    this.viewState = viewState;
    this.sections = [...sections];
  }

  addSection(section: SectionDescriptor, index = this.sections.length): void {
    this.sections.splice(index, 0, section);
  }

  view(): PanelView {
    const nodes = this.ctx.selection
      .ids()
      .map((id) => this.ctx.doc.require(id));
    const collapsed = new Set(this.viewState().collapsedSections);
    const sections: SectionView[] = [];
    for (const section of this.sections) {
      const fields: FieldView[] = [];
      for (const f of section.fields) {
        const applies = nodes.filter((node) => f.appliesTo(node));
        const combined = combine(
          applies.map((node) => f.read(node, this.ctx.doc)),
          (value) => formatFieldValue(f.kind, value)
        );
        if (!combined) continue;
        fields.push({
          label: f.label,
          value: combined.text,
          mixed: combined.mixed,
          readonly: !!f.readonly,
        });
      }
      if (fields.length)
        sections.push({
          name: section.name,
          title: section.title,
          collapsed: collapsed.has(section.name),
          fields,
        });
    }
    return { count: nodes.length, sections };
  }

  /** The shown value of one field, by label, or undefined when it is not shown. */
  value(label: string): string | undefined {
    for (const section of this.view().sections) {
      const f = section.fields.find((candidate) => candidate.label === label);
      if (f) return f.value;
    }
    return undefined;
  }

  edit(label: string, text: string): CommitResult {
    return commitField(this.ctx, this.field(label), text);
  }

  field(label: string): FieldDescriptor {
    for (const section of this.sections) {
      const f = section.fields.find((candidate) => candidate.label === label);
      if (f) return f;
    }
    fail('unknown-field', `the panel has no field "${label}"`);
  }

  toggleSection(name: string): void {
    const state = this.viewState();
    const set = new Set(state.collapsedSections);
    if (set.has(name)) set.delete(name);
    else set.add(name);
    state.collapsedSections = [...set].sort();
  }
}
