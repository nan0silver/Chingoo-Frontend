import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface LayoutProps {
  children: ReactNode;
  className?: string;
}

/**
 * 앱 전체에 공통으로 적용되는 레이아웃 컨테이너.
 * - 뷰포트 기준 중앙 정렬, max-width: 430px, width: 100%
 * - 고정 높이(100dvh) + 내부 스크롤로 스크롤바를 Layout 안에 두어,
 *   페이지별 스크롤바 유무에 따른 앱 위치 밀림 방지
 */
export function Layout({ children, className }: LayoutProps) {
  return (
    <div
      className={cn(
        "w-full max-w-[430px] h-[100dvh] max-h-[100dvh] mx-auto bg-white relative",
        "flex flex-col overflow-x-hidden overflow-y-auto",
        "min-h-0", // flex 자식이 내용에 따라 커지지 않도록
        className
      )}
    >
      {children}
    </div>
  );
}
