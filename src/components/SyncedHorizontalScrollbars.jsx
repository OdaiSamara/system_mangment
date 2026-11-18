import { useLayoutEffect, useRef, useState } from "react";
import { Box } from "@mui/material";

export default function SyncedHorizontalScrollbars({ children }) {
  const topRef = useRef(null);
  const wrapperRef = useRef(null);
  const tableScrollRef = useRef(null);
  const [contentWidth, setContentWidth] = useState(0);
  const [hasOverflow, setHasOverflow] = useState(false);

  useLayoutEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return undefined;
    const tableContainer = wrapper.querySelector(".MuiTableContainer-root") ?? wrapper.firstElementChild;
    if (!tableContainer) return undefined;
    tableScrollRef.current = tableContainer;

    const measure = () => {
      const width = Math.max(tableContainer.scrollWidth, tableContainer.clientWidth);
      setContentWidth(width);
      setHasOverflow(tableContainer.scrollWidth > tableContainer.clientWidth + 1);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(tableContainer);
    if (tableContainer.firstElementChild) observer.observe(tableContainer.firstElementChild);
    tableContainer.addEventListener("scroll", syncTableScroll, { passive: true });
    return () => {
      observer.disconnect();
      tableContainer.removeEventListener("scroll", syncTableScroll);
    };
  }, [children]);

  function syncTableScroll() {
    syncScroll(tableScrollRef.current, [topRef.current]);
  }

  function syncScroll(source, targets) {
    const scrollLeft = source.scrollLeft;
    targets.forEach((target) => {
      if (target && target.scrollLeft !== scrollLeft) target.scrollLeft = scrollLeft;
    });
  }

  return (
    <Box>
      <Box
        ref={topRef}
        role="region"
        onScroll={(event) => syncScroll(event.currentTarget, [tableScrollRef.current])}
        sx={{ height: hasOverflow ? 16 : 0, overflowX: "auto", overflowY: "hidden" }}
        aria-label="شريط التمرير الأفقي العلوي"
      >
        <Box sx={{ width: contentWidth, height: 1 }} />
      </Box>
      <Box
        ref={wrapperRef}
        sx={{ maxWidth: "100%" }}
      >
        {children}
      </Box>
    </Box>
  );
}
