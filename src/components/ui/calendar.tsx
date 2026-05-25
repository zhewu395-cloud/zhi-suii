"use client";

import * as React from "react";
import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { DayButton, DayPicker, getDefaultClassNames } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";

const CN_WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

const cnFormatters = {
  formatWeekdayName: (date: Date) => CN_WEEKDAYS[date.getDay()],
  formatCaption: (date: Date) =>
    `${date.getFullYear()} 年 ${date.getMonth() + 1} 月`,
  formatMonthCaption: (date: Date) =>
    `${date.getFullYear()} 年 ${date.getMonth() + 1} 月`,
  formatMonthDropdown: (date: Date) => `${date.getMonth() + 1} 月`,
  formatYearDropdown: (date: Date) => `${date.getFullYear()} 年`,
  formatYearCaption: (date: Date) => `${date.getFullYear()} 年`,
};

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = "label",
  buttonVariant = "ghost",
  formatters,
  components,
  ...props
}: React.ComponentProps<typeof DayPicker> & {
  buttonVariant?: React.ComponentProps<typeof Button>["variant"];
}) {
  const defaultClassNames = getDefaultClassNames();

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      weekStartsOn={1}
      className={cn(
        // 高级奶白底色，覆盖 popover/card 容器
        "group/calendar p-3 [--cell-size:2.1rem] rounded-2xl",
        "bg-[oklch(0.985_0.012_85)] [[data-slot=card-content]_&]:bg-[oklch(0.985_0.012_85)] [[data-slot=popover-content]_&]:bg-[oklch(0.985_0.012_85)]",
        "shadow-[0_8px_24px_-12px_oklch(0.30_0.05_140_/_0.25)] border border-[oklch(0.85_0.020_90_/_0.6)]",
        String.raw`rtl:**:[.rdp-button\_next>svg]:rotate-180`,
        String.raw`rtl:**:[.rdp-button\_previous>svg]:rotate-180`,
        className,
      )}
      captionLayout={captionLayout}
      formatters={{
        ...cnFormatters,
        ...formatters,
      }}
      classNames={{
        root: cn("w-fit", defaultClassNames.root),
        months: cn("relative flex flex-col gap-4 md:flex-row", defaultClassNames.months),
        month: cn("flex w-full flex-col gap-4", defaultClassNames.month),
        nav: cn(
          "absolute inset-x-0 top-0 flex w-full items-center justify-between gap-1",
          defaultClassNames.nav,
        ),
        button_previous: cn(
          buttonVariants({ variant: buttonVariant }),
          "h-(--cell-size) w-(--cell-size) select-none p-0 aria-disabled:opacity-50",
          defaultClassNames.button_previous,
        ),
        button_next: cn(
          buttonVariants({ variant: buttonVariant }),
          "h-(--cell-size) w-(--cell-size) select-none p-0 aria-disabled:opacity-50",
          defaultClassNames.button_next,
        ),
        month_caption: cn(
          "flex h-(--cell-size) w-full items-center justify-center px-(--cell-size)",
          defaultClassNames.month_caption,
        ),
        dropdowns: cn(
          "flex h-(--cell-size) w-full items-center justify-center gap-1.5 text-sm font-medium",
          defaultClassNames.dropdowns,
        ),
        dropdown_root: cn(
          "has-focus:border-ring border-input shadow-xs has-focus:ring-ring/50 has-focus:ring-[3px] relative rounded-md border",
          defaultClassNames.dropdown_root,
        ),
        dropdown: cn("bg-popover absolute inset-0 opacity-0", defaultClassNames.dropdown),
        caption_label: cn(
          "select-none font-medium text-[oklch(0.30_0.06_140)]",
          captionLayout === "label"
            ? "text-sm"
            : "[&>svg]:text-muted-foreground flex h-8 items-center gap-1 rounded-md pl-2 pr-1 text-sm [&>svg]:size-3.5",
          defaultClassNames.caption_label,
        ),
        table: "w-full border-collapse",
        weekdays: cn("flex", defaultClassNames.weekdays),
        weekday: cn(
          "flex-1 select-none rounded-md text-[0.78rem] font-normal text-[oklch(0.45_0.05_140_/_0.75)]",
          defaultClassNames.weekday,
        ),
        week: cn("mt-1.5 flex w-full", defaultClassNames.week),
        week_number_header: cn("w-(--cell-size) select-none", defaultClassNames.week_number_header),
        week_number: cn(
          "text-muted-foreground select-none text-[0.8rem]",
          defaultClassNames.week_number,
        ),
        day: cn(
          "group/day relative aspect-square h-full w-full select-none p-0.5 text-center",
          defaultClassNames.day,
        ),
        range_start: cn("rounded-l-[6px]", defaultClassNames.range_start),
        range_middle: cn("rounded-none", defaultClassNames.range_middle),
        range_end: cn("rounded-r-[6px]", defaultClassNames.range_end),
        today: cn("", defaultClassNames.today),
        outside: cn(
          "text-muted-foreground/60 aria-selected:text-muted-foreground",
          defaultClassNames.outside,
        ),
        disabled: cn("text-muted-foreground opacity-50", defaultClassNames.disabled),
        hidden: cn("invisible", defaultClassNames.hidden),
        ...classNames,
      }}
      components={{
        Root: ({ className, rootRef, ...props }) => {
          return <div data-slot="calendar" ref={rootRef} className={cn(className)} {...props} />;
        },
        Chevron: ({ className, orientation, ...props }) => {
          if (orientation === "left") {
            return <ChevronLeftIcon className={cn("size-4", className)} {...props} />;
          }

          if (orientation === "right") {
            return <ChevronRightIcon className={cn("size-4", className)} {...props} />;
          }

          return <ChevronDownIcon className={cn("size-4", className)} {...props} />;
        },
        DayButton: CalendarDayButton,
        WeekNumber: ({ children, ...props }) => {
          return (
            <td {...props}>
              <div className="flex size-(--cell-size) items-center justify-center text-center">
                {children}
              </div>
            </td>
          );
        },
        ...components,
      }}
      {...props}
    />
  );
}

function CalendarDayButton({
  className,
  day,
  modifiers,
  ...props
}: React.ComponentProps<typeof DayButton>) {
  const defaultClassNames = getDefaultClassNames();

  const ref = React.useRef<HTMLButtonElement>(null);
  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus();
  }, [modifiers.focused]);

  const isSelectedSingle =
    modifiers.selected &&
    !modifiers.range_start &&
    !modifiers.range_end &&
    !modifiers.range_middle;

  return (
    <Button
      ref={ref}
      variant="ghost"
      size="icon"
      data-day={day.date.toLocaleDateString()}
      data-today={modifiers.today ? "true" : undefined}
      data-selected-single={isSelectedSingle}
      data-range-start={modifiers.range_start}
      data-range-end={modifiers.range_end}
      data-range-middle={modifiers.range_middle}
      className={cn(
        // 基础：圆角矩形（不圆不方）
        "flex aspect-square h-auto w-full min-w-(--cell-size) flex-col gap-1 font-normal leading-none rounded-[11px]",
        "text-[oklch(0.28_0.04_140)] hover:bg-[oklch(0.92_0.045_138_/_0.55)]",
        // 当天：偏绿一点的深绿
        "data-[today=true]:bg-[oklch(0.38_0.085_148)] data-[today=true]:text-[oklch(0.97_0.020_140)] data-[today=true]:font-medium data-[today=true]:rounded-[11px]",
        // 选中（筛选）：凝实的淡绿，与当天协调
        "data-[selected-single=true]:bg-[oklch(0.82_0.060_146)] data-[selected-single=true]:text-[oklch(0.22_0.06_148)] data-[selected-single=true]:rounded-[11px]",
        // range
        "data-[range-middle=true]:bg-[oklch(0.88_0.050_146)] data-[range-middle=true]:text-[oklch(0.25_0.06_148)]",
        "data-[range-start=true]:bg-[oklch(0.82_0.060_146)] data-[range-start=true]:text-[oklch(0.22_0.06_148)] data-[range-start=true]:rounded-l-[11px]",
        "data-[range-end=true]:bg-[oklch(0.82_0.060_146)] data-[range-end=true]:text-[oklch(0.22_0.06_148)] data-[range-end=true]:rounded-r-[11px]",
        "group-data-[focused=true]/day:border-ring group-data-[focused=true]/day:ring-ring/50",
        "group-data-[focused=true]/day:relative group-data-[focused=true]/day:z-10 group-data-[focused=true]/day:ring-[3px]",
        "[&>span]:text-xs [&>span]:opacity-70",
        defaultClassNames.day,
        className,
      )}
      {...props}
    />
  );
}

export { Calendar, CalendarDayButton };
