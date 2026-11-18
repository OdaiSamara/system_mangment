import { useEffect, useMemo, useState } from "react";
import {
  Box, Button, Checkbox, CircularProgress, FormControlLabel, IconButton,
  InputAdornment, Menu, MenuItem, Pagination, Paper, Stack, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow, TextField,
  Tooltip, Typography, Popover,
} from "@mui/material";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import FilterListOutlinedIcon from "@mui/icons-material/FilterListOutlined";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import ViewColumnOutlinedIcon from "@mui/icons-material/ViewColumnOutlined";
import { exportExcel } from "../utils/exportExcel.js";
import { formatDate } from "../utils/dateFormat.js";
import { getTableFieldLabel, isApiLinkField, localizeTableValue } from "../utils/tableLocalization.js";
import ActionDropdown from "./ActionDropdown.jsx";
import SyncedHorizontalScrollbars from "./SyncedHorizontalScrollbars.jsx";

function plainValue(value, field = "") {
  return localizeTableValue(value, field);
}

function normalizeColumns(columns, items, includeAllFields) {
  const normalized = columns.map((column) => (
    Array.isArray(column)
      ? { id: column[0], label: column[1] }
      : column
  )).filter((column) => !isApiLinkField(column.id));
  if (!includeAllFields) return normalized;

  const known = new Set(normalized.map((column) => column.id));
  const extraKeys = [...new Set(items.flatMap((item) => Object.keys(item ?? {})))]
    .filter((key) => !known.has(key) && !key.startsWith("__") && !isApiLinkField(key));
  return [
    ...normalized,
    ...extraKeys.map((id) => ({
      id,
      label: getTableFieldLabel(id),
    })),
  ];
}

export default function DataTable({
  loading = false,
  items = [],
  columns = [],
  actions,
  includeAllFields = false,
  emptyMessage = "لا توجد سجلات لعرضها.",
  filename = "البيانات",
}) {
  const [search, setSearch] = useState("");
  const [hiddenColumns, setHiddenColumns] = useState([]);
  const [columnsAnchor, setColumnsAnchor] = useState(null);
  const [filterAnchor, setFilterAnchor] = useState(null);
  const [filterColumn, setFilterColumn] = useState(null);
  const [columnFilters, setColumnFilters] = useState({});
  const [sort, setSort] = useState({ id: "", direction: "asc" });
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const allColumns = useMemo(
    () => normalizeColumns(columns, items, includeAllFields),
    [columns, items, includeAllFields],
  );
  const shownColumns = allColumns.filter((column) => !hiddenColumns.includes(column.id));

  function valueFor(item, column) {
    return column.value ? column.value(item) : item[column.id];
  }

  const filteredItems = items.filter((item) => {
    const query = search.trim().toLocaleLowerCase();
    const matchesSearch = !query || allColumns.some((column) => (
      plainValue(valueFor(item, column), column.id).toLocaleLowerCase().includes(query)
    ));
    return matchesSearch && allColumns.every((column) => {
      const filter = columnFilters[column.id]?.trim().toLocaleLowerCase();
      return !filter || plainValue(valueFor(item, column), column.id).toLocaleLowerCase().includes(filter);
    });
  });
  const sortedItems = sort.id && allColumns.some((column) => column.id === sort.id)
    ? [...filteredItems].sort((first, second) => {
      const column = allColumns.find((item) => item.id === sort.id);
      const firstValue = plainValue(valueFor(first, column), column.id);
      const secondValue = plainValue(valueFor(second, column), column.id);
      const result = firstValue.localeCompare(secondValue, "ar", { numeric: true });
      return sort.direction === "asc" ? result : -result;
    })
    : filteredItems;
  const pageCount = Math.max(1, Math.ceil(sortedItems.length / rowsPerPage));
  const pageItems = sortedItems.slice((page - 1) * rowsPerPage, page * rowsPerPage);
  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  function exportRows() {
    exportExcel(
      filename,
      shownColumns.map((column) => column.label),
      sortedItems.map((item) => shownColumns.map((column) => (
        column.exportValue
          ? column.exportValue(item)
          : column.id.endsWith("_at")
            ? formatDate(valueFor(item, column))
            : plainValue(valueFor(item, column), column.id)
      ))),
    );
  }

  return (
    <Paper variant="outlined" sx={{ overflow: "hidden" }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1}
        alignItems={{ xs: "stretch", sm: "center" }}
        sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}
      >
        <TextField
          size="small"
          type="search"
          placeholder="بحث في جميع الأعمدة"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchRoundedIcon fontSize="small" /></InputAdornment> }}
          inputProps={{ "aria-label": "بحث في جميع الأعمدة" }}
          sx={{ flex: 1 }}
        />
        <Button
          variant="outlined"
          startIcon={<ViewColumnOutlinedIcon />}
          endIcon={<ExpandMoreRoundedIcon />}
          onClick={(event) => setColumnsAnchor(event.currentTarget)}
          sx={{ whiteSpace: "nowrap" }}
        >
          الأعمدة ({shownColumns.length}/{allColumns.length})
        </Button>
        <Menu anchorEl={columnsAnchor} open={Boolean(columnsAnchor)} onClose={() => setColumnsAnchor(null)}>
          <Stack direction="row" spacing={1} sx={{ px: 1.5, py: 0.75 }}>
            <Button size="small" onClick={() => setHiddenColumns([])}>إظهار الكل</Button>
            <Button size="small" onClick={() => setHiddenColumns(allColumns.map((column) => column.id))}>إخفاء الكل</Button>
          </Stack>
          {allColumns.map((column) => (
            <MenuItem
              key={column.id}
              dense
              onClick={() => setHiddenColumns((current) => current.includes(column.id)
                ? current.filter((id) => id !== column.id)
                : [...current, column.id])}
            >
              <FormControlLabel
                sx={{ m: 0, width: "100%" }}
                control={<Checkbox size="small" checked={!hiddenColumns.includes(column.id)} />}
                label={column.label}
              />
            </MenuItem>
          ))}
        </Menu>
        <Button
          variant="outlined"
          startIcon={<DownloadOutlinedIcon />}
          onClick={exportRows}
          disabled={loading || !shownColumns.length}
          sx={{ whiteSpace: "nowrap" }}
        >
          تصدير Excel
        </Button>
      </Stack>

      {loading ? (
        <Box sx={{ minHeight: 180, display: "grid", placeItems: "center" }}><CircularProgress /></Box>
      ) : (
        <SyncedHorizontalScrollbars>
          <TableContainer>
          <Table size="small" sx={{ width: "max-content", minWidth: "100%" }}>
            <TableHead>
              <TableRow>
                {actions && <TableCell sx={{ whiteSpace: "nowrap" }}>الإجراءات</TableCell>}
                {shownColumns.map((column) => (
                  <TableCell key={column.id} sx={{ whiteSpace: "nowrap" }}>
                    <Stack direction="row" spacing={0.25} alignItems="center">
                      <Button
                        size="small"
                        color={sort.id === column.id ? "primary" : "inherit"}
                        onClick={() => {
                          setSort((current) => ({
                            id: column.id,
                            direction: current.id === column.id && current.direction === "asc" ? "desc" : "asc",
                          }));
                          setPage(1);
                        }}
                      >
                        {column.label}{sort.id === column.id ? (sort.direction === "asc" ? " ↑" : " ↓") : ""}
                      </Button>
                      <Tooltip title={`تصفية ${column.label}`}>
                        <IconButton
                          size="small"
                          color={columnFilters[column.id]?.trim() ? "primary" : "default"}
                          aria-label={`تصفية ${column.label}`}
                          onClick={(event) => {
                            setFilterColumn(column);
                            setFilterAnchor(event.currentTarget);
                          }}
                        >
                          <FilterListOutlinedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {pageItems.map((item, index) => (
                <TableRow
                  hover
                  key={item.__rowKey ?? (item.__trashResource ? `${item.__trashResource}:${item.id}` : item.id) ?? `${page}-${index}`}
                >
                  {actions && (
                    <TableCell sx={{ minWidth: 150, textAlign: "center" }}>
                      <ActionDropdown label="الإجراءات">{actions(item)}</ActionDropdown>
                    </TableCell>
                  )}
                  {shownColumns.map((column) => {
                    const value = valueFor(item, column);
                    return (
                      <TableCell key={column.id}>
                        {column.render
                          ? column.render(value, item)
                          : column.id.endsWith("_at")
                            ? formatDate(value)
                            : plainValue(value, column.id)}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
              {!pageItems.length && (
                <TableRow>
                  <TableCell colSpan={shownColumns.length + (actions ? 1 : 0)} align="center">
                    <Typography color="text.secondary" sx={{ py: 3 }}>{emptyMessage}</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          </TableContainer>
        </SyncedHorizontalScrollbars>
      )}
      <Popover
        open={Boolean(filterAnchor && filterColumn)}
        anchorEl={filterAnchor}
        onClose={() => { setFilterAnchor(null); setFilterColumn(null); }}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      >
        {filterColumn && <Box sx={{ p: 2, width: 280 }}>
          <Typography fontWeight={800} sx={{ mb: 1 }}>{filterColumn.label}</Typography>
          <TextField
            autoFocus
            size="small"
            type="search"
            fullWidth
            label="بحث في هذا العمود"
            value={columnFilters[filterColumn.id] ?? ""}
            onChange={(event) => {
              setColumnFilters((current) => ({ ...current, [filterColumn.id]: event.target.value }));
              setPage(1);
            }}
          />
          <Button
            size="small"
            sx={{ mt: 1 }}
            onClick={() => {
              setColumnFilters((current) => ({ ...current, [filterColumn.id]: "" }));
              setPage(1);
            }}
          >
            مسح التصفية
          </Button>
        </Box>}
      </Popover>
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={1.5}
        alignItems="center"
        justifyContent="space-between"
        sx={{ p: 1.5, borderTop: 1, borderColor: "divider" }}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="body2" color="text.secondary">عدد السجلات</Typography>
          <TextField
            select
            size="small"
            value={rowsPerPage}
            onChange={(event) => {
              setRowsPerPage(Number(event.target.value));
              setPage(1);
            }}
            sx={{ width: 90 }}
            inputProps={{ "aria-label": "عدد السجلات في الصفحة" }}
          >
            {[10, 25, 50, 100].map((size) => <MenuItem key={size} value={size}>{size}</MenuItem>)}
          </TextField>
          <Typography variant="body2" color="text.secondary">{sortedItems.length} سجل</Typography>
        </Stack>
        {pageCount > 1 && <Pagination count={pageCount} page={page} onChange={(_event, value) => setPage(value)} color="primary" shape="rounded" size="small" siblingCount={0} boundaryCount={1} />}
      </Stack>
    </Paper>
  );
}
