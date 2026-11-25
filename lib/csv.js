function cell(value) {
  const text = String(value === undefined || value === null ? "" : value);
  return `"${text.replace(/"/g, '""')}"`;
}

export function toCsv(rows, columns) {
  const head = columns.map((column) => cell(column.label)).join(",");
  const body = (rows || []).map((row) =>
    columns.map((column) => cell(column.value(row))).join(",")
  );
  return [head, ...body].join("\r\n");
}

export function downloadCsv(filename, rows, columns) {
  const blob = new Blob([toCsv(rows, columns)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.toLowerCase().endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
