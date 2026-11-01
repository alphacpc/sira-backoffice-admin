"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function TabsWithUrl({
  items, defaultValue,
}: {
  items: { value: string; label: string; content: React.ReactNode }[];
  defaultValue: string;
}) {
  const [value, setValue] = useState(defaultValue);

  function onChange(next: string) {
    setValue(next);
    const url = new URL(window.location.href);
    url.searchParams.set("onglet", next);
    window.history.replaceState(null, "", url);
  }

  return (
    <Tabs value={value} onValueChange={onChange}>
      <TabsList>
        {items.map((i) => (
          <TabsTrigger key={i.value} value={i.value}>{i.label}</TabsTrigger>
        ))}
      </TabsList>
      {items.map((i) => (
        <TabsContent key={i.value} value={i.value}>{i.content}</TabsContent>
      ))}
    </Tabs>
  );
}
