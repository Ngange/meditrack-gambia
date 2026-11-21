import type { ComponentType, ReactNode } from 'react';
import type { RecordCrud } from '../../hooks/useRecordCrud';
import type { EnteredBy } from '../../types/records';
import { formatDate } from '../../utils/dates';
import { ErrorCard } from '../ui/ErrorCard';
import { Loading } from '../ui/Loading';
import type { RecordFormProps } from './types';
import { useRecordsScope } from './useRecordsScope';

type RecordPageProps<T, I> = {
  title: string;
  subtitle: string;
  addLabel: string;
  emptyMessage: string;
  crud: RecordCrud<T, I>;
  /** The add / edit form for this record type. */
  Form: ComponentType<RecordFormProps<T, I>>;
  /** What one record looks like inside its card (the Edit / Delete buttons are added for you). */
  renderItem: (item: T) => ReactNode;
  /** The question asked before deleting. */
  confirmDelete: (item: T) => string;
  /** Extra button(s) next to the add button. */
  headerExtra?: ReactNode;
  /** Extra content under the heading, above the list (for example a second kind of form). */
  children?: ReactNode;
};

// The page every record type shares: heading, add button, form, loading / error / empty states,
// and the list of cards with Edit and Delete. A feature supplies only what is different.
export function RecordPage<T, I>({
  title,
  subtitle,
  addLabel,
  emptyMessage,
  crud,
  Form,
  renderItem,
  confirmDelete,
  headerExtra,
  children,
}: RecordPageProps<T, I>) {
  const { items, loading, error, editing, editingItem } = crud;
  const scope = useRecordsScope();
  const doctor = scope.mode === 'doctor';

  // A doctor may edit only what they entered and never delete. A patient may not edit what a doctor
  // entered (they can delete it). The server enforces the same rules; this just hides buttons that would fail.
  const authorOf = (item: T) => (item as { entered_by?: EnteredBy | null }).entered_by ?? null;
  const canEdit = (item: T) => (doctor ? authorOf(item)?.provider_id === scope.providerId : !authorOf(item));
  const createdOn = (item: T) => (item as { created_at?: string }).created_at?.slice(0, 10);

  return (
    <div className="allergies-page">
      <div className="allergies-inner">
        <div className="allergies-head">
          <div>
            <h1>{title}</h1>
            {!doctor && <p className="page-sub">{subtitle}</p>}
          </div>
          {editing === null && (
            <div className="a-actions">
              {headerExtra}
              <button type="button" className="a-btn a-btn-dark" onClick={crud.openNew}>
                {addLabel}
              </button>
            </div>
          )}
        </div>

        {editing !== null && (
          <Form
            key={editingItem ? crud.getId(editingItem) : 'new'}
            initial={editingItem}
            saving={crud.saving}
            error={crud.formError}
            onSubmit={crud.save}
            onCancel={crud.closeForm}
          />
        )}

        {children}

        {loading ? (
          <Loading />
        ) : error ? (
          <ErrorCard message={error} onRetry={crud.reload} />
        ) : items.length === 0 ? (
          <p className="a-muted">{doctor ? 'Nothing recorded yet.' : emptyMessage}</p>
        ) : (
          <ul className="a-list">
            {items.map((item) => (
              <li key={crud.getId(item)} className="a-card a-item">
                {renderItem(item)}
                {authorOf(item) && (
                  <div className="a-meta rec-author">
                    Entered by {authorOf(item)?.name}
                    {authorOf(item)?.facility ? `, ${authorOf(item)?.facility}` : ''}
                    {createdOn(item) ? `, ${formatDate(createdOn(item) as string)}` : ''}
                  </div>
                )}
                <div className="a-actions">
                  {canEdit(item) && (
                    <button type="button" className="a-btn a-btn-sm" onClick={() => crud.openEdit(item)}>
                      Edit
                    </button>
                  )}
                  {!doctor && (
                    <button
                      type="button"
                      className="a-btn a-btn-sm a-btn-danger"
                      onClick={() => {
                        if (window.confirm(confirmDelete(item))) crud.remove(item);
                      }}>
                      Delete
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
