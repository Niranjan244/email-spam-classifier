export const Table = ({ children, className = '', ...props }) => {
  return (
    <div className="w-full overflow-x-auto border border-border rounded-xl bg-surface">
      <table className={`w-full text-left text-sm border-collapse ${className}`.trim()} {...props}>
        {children}
      </table>
    </div>
  );
};

export const TableHeader = ({ children, className = '', ...props }) => {
  return (
    <thead
      className={`sticky top-0 bg-surface-muted text-xs font-semibold text-text-muted uppercase tracking-wider border-b border-border z-10 ${className}`.trim()}
      {...props}
    >
      {children}
    </thead>
  );
};

export const TableBody = ({ children, className = '', ...props }) => {
  return (
    <tbody className={`divide-y divide-border bg-surface ${className}`.trim()} {...props}>
      {children}
    </tbody>
  );
};

export const TableRow = ({ children, className = '', ...props }) => {
  return (
    <tr
      className={`h-[52px] border-b border-border last:border-0 hover:bg-surface-muted transition-colors duration-150 ${className}`.trim()}
      {...props}
    >
      {children}
    </tr>
  );
};

export const TableHead = ({ children, align = 'left', className = '', ...props }) => {
  const alignClass = align === 'right' ? 'text-right' : 'text-left';
  return (
    <th
      className={`px-4 py-3 h-11 font-semibold text-text-muted ${alignClass} ${className}`.trim()}
      {...props}
    >
      {children}
    </th>
  );
};

export const TableCell = ({
  children,
  align = 'left',
  isNumber = false,
  className = '',
  ...props
}) => {
  const alignClass = align === 'right' || isNumber ? 'text-right tabular-nums' : 'text-left';

  return (
    <td
      className={`px-4 py-3 h-[52px] text-text align-middle ${alignClass} ${className}`.trim()}
      {...props}
    >
      {children}
    </td>
  );
};

Table.Header = TableHeader;
Table.Body = TableBody;
Table.Row = TableRow;
Table.Head = TableHead;
Table.Cell = TableCell;

export default Table;
