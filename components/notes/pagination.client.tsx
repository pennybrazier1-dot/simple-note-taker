"use client";

/**
 * Pagination Component
 * Handles page navigation via URL parameters
 */
import { useRouter, useSearchParams } from "next/navigation";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface NotesPaginationProps {
  currentPage: number;
  pageCount: number;
}

export default function NotesPagination({
  currentPage,
  pageCount,
}: NotesPaginationProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const createPageUrl = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", page.toString());
    return `/dashboard/notes?${params.toString()}`;
  };

  const handlePageChange = (page: number) => {
    if (page < 1 || page > pageCount) return;
    router.push(createPageUrl(page));
  };

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages: (number | "ellipsis")[] = [];
    const maxVisible = 5;

    if (pageCount <= maxVisible) {
      // Show all pages if total is small
      for (let i = 1; i <= pageCount; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      if (currentPage > 3) {
        pages.push("ellipsis");
      }

      // Show pages around current page
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(pageCount - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        if (i !== 1 && i !== pageCount) {
          pages.push(i);
        }
      }

      if (currentPage < pageCount - 2) {
        pages.push("ellipsis");
      }

      // Always show last page
      if (pageCount > 1) {
        pages.push(pageCount);
      }
    }

    return pages;
  };

  if (pageCount <= 1) return null;

  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            href={createPageUrl(currentPage - 1)}
            onClick={(e) => {
              e.preventDefault();
              handlePageChange(currentPage - 1);
            }}
            className={
              currentPage === 1 ? "pointer-events-none opacity-50" : ""
            }
          />
        </PaginationItem>

        {getPageNumbers().map((page, index) => {
          if (page === "ellipsis") {
            return (
              <PaginationItem key={`ellipsis-${index}`}>
                <PaginationEllipsis />
              </PaginationItem>
            );
          }

          return (
            <PaginationItem key={page}>
              <PaginationLink
                href={createPageUrl(page)}
                onClick={(e) => {
                  e.preventDefault();
                  handlePageChange(page);
                }}
                isActive={currentPage === page}
              >
                {page}
              </PaginationLink>
            </PaginationItem>
          );
        })}

        <PaginationItem>
          <PaginationNext
            href={createPageUrl(currentPage + 1)}
            onClick={(e) => {
              e.preventDefault();
              handlePageChange(currentPage + 1);
            }}
            className={
              currentPage === pageCount
                ? "pointer-events-none opacity-50"
                : ""
            }
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}

