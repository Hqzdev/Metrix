"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { getPayloadConfigFromPayload } from "./payload-config";

type ChartTooltipRowProps = {
  item: any;
  itemConfig: ReturnType<typeof getPayloadConfigFromPayload>;
  indicator: "line" | "dot" | "dashed";
  indicatorColor: string;
  hideIndicator: boolean;
  nestLabel: boolean;
  tooltipLabel: React.ReactNode;
};

export function ChartTooltipRow({
  item,
  itemConfig,
  indicator,
  indicatorColor,
  hideIndicator,
  nestLabel,
  tooltipLabel,
}: ChartTooltipRowProps) {
  return (
    <>
      {itemConfig?.icon ? (
        <itemConfig.icon />
      ) : (
        !hideIndicator && (
          <div
            className={cn(
              "shrink-0 rounded-[2px] border-(--color-border) bg-(--color-bg)",
              {
                "h-2.5 w-2.5": indicator === "dot",
                "w-1": indicator === "line",
                "w-0 border-[1.5px] border-dashed bg-transparent":
                  indicator === "dashed",
                "my-0.5": nestLabel && indicator === "dashed",
              },
            )}
            style={
              {
                "--color-bg": indicatorColor,
                "--color-border": indicatorColor,
              } as React.CSSProperties
            }
          />
        )
      )}
      <div
        className={cn(
          "flex flex-1 justify-between leading-none",
          nestLabel ? "items-end" : "items-center",
        )}
      >
        <div className="grid gap-1.5">
          {nestLabel ? tooltipLabel : null}
          <span className="text-muted-foreground">
            {itemConfig?.label || item.name}
          </span>
        </div>
        {item.value && (
          <span className="text-foreground font-mono font-medium tabular-nums">
            {item.value.toLocaleString()}
          </span>
        )}
      </div>
    </>
  );
}
