"use client";

/**
 * Notes Toolbar Component
 * Provides search, category filter, and archive toggle
 * Updates URL query parameters for state persistence
 */
import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

// Helper function to get color value from color name
function getCategoryColor(colorName: string): string {
  const colorMap: Record<string, string> = {
    blue: "#3b82f6",
    green: "#10b981",
    purple: "#8b5cf6",
    red: "#ef4444",
    yellow: "#eab308",
    orange: "#f97316",
    pink: "#ec4899",
    indigo: "#6366f1",
    slate: "#64748b",
    gray: "#6b7280",
  };
  return colorMap[colorName] || colorMap.slate;
}

type Category = {
  id: string;
  name: string;
  color: string;
};

interface NotesToolbarProps {
  categories: Category[];
  initialSearch?: string;
  initialCategory?: string | null;
  initialIncludeArchived?: boolean;
}

export default function NotesToolbar({
  categories,
  initialSearch = "",
  initialCategory = null,
  initialIncludeArchived = false,
}: NotesToolbarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(initialSearch);
  const [category, setCategory] = useState<string | null>(initialCategory);
  const [includeArchived, setIncludeArchived] = useState(initialIncludeArchived);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      updateURL();
    }, 300);

    return () => clearTimeout(timer);
  }, [search, category, includeArchived]);

  const updateURL = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());

    // Update search query
    if (search.trim().length >= 2) {
      params.set("q", search.trim());
    } else {
      params.delete("q");
    }

    // Update category
    if (category) {
      params.set("category", category);
    } else {
      params.delete("category");
    }

    // Update includeArchived
    if (includeArchived) {
      params.set("includeArchived", "true");
    } else {
      params.delete("includeArchived");
    }

    // Reset to page 1 when filters change
    params.set("page", "1");

    router.push(`/dashboard/notes?${params.toString()}`);
  }, [search, category, includeArchived, router, searchParams]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  };

  const handleCategoryChange = (value: string) => {
    setCategory(value === "all" ? null : value);
  };

  const handleArchiveToggle = (checked: boolean) => {
    setIncludeArchived(checked);
  };

  return (
    <div className="mb-6 space-y-4">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search notes by title or content..."
          value={search}
          onChange={handleSearchChange}
          className="pl-10"
        />
      </div>

      {/* Filters Row */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        {/* Category Filter */}
        <div className="flex-1 min-w-[200px]">
          <Select
            value={category || "all"}
            onValueChange={handleCategoryChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  <div className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{
                        backgroundColor: getCategoryColor(cat.color),
                      }}
                    />
                    {cat.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Include Archived Toggle */}
        <div className="flex items-center gap-2">
          <Switch
            id="include-archived"
            checked={includeArchived}
            onCheckedChange={handleArchiveToggle}
          />
          <Label
            htmlFor="include-archived"
            className="text-sm font-normal cursor-pointer"
          >
            Include archived
          </Label>
        </div>
      </div>
    </div>
  );
}

