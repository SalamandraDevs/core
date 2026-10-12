/**
 * Platform index for tenant-scoped record identity lookups and mutations.
 * @remarks
 * The composite `(tenantId, recordId)` key is unique, enforcing one record per identifier
 * within a tenant and backing the tenant-scoped read, update, and delete paths of
 * {@link RecordsHandler}. Its column order also matches the handler's `createdAt`/`recordId`
 * find ordering.
 * @group Storage
 * @category Storage
 */
export const recordIndexDef = {
    name: 'tenant_record',
    fields: [
        { name: 'tenantId', direction: 'asc' },
        { name: 'recordId', direction: 'asc' }
    ],
    unique: true
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXhkZWZzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL3N0b3JhZ2UvaW5kZXhkZWZzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUVBOzs7Ozs7Ozs7R0FTRztBQUNILE1BQU0sQ0FBQyxNQUFNLGNBQWMsR0FBYTtJQUN0QyxJQUFJLEVBQUUsZUFBZTtJQUNyQixNQUFNLEVBQUU7UUFDTixFQUFFLElBQUksRUFBRSxVQUFVLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFBRTtRQUN0QyxFQUFFLElBQUksRUFBRSxVQUFVLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFBRTtLQUN2QztJQUNELE1BQU0sRUFBRSxJQUFJO0NBQ2UsQ0FBQyJ9