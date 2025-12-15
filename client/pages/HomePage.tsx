import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { getUserProfile, getStoredToken } from "@/lib/auth";
import { useMatchingStore } from "@/lib/matchingStore";
import { CATEGORIES, CategoryRequest } from "@shared/api";
import CategoryRequestModal from "@/components/CategoryRequestModal";
import BottomNavigation, { BottomNavItem } from "@/components/BottomNavigation";

interface HomePageProps {
  onStartCall: (category: string) => void;
  onOpenSettings: () => void;
}

export default function HomePage({
  onStartCall,
  onOpenSettings,
}: HomePageProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { startMatching, status, error } = useMatchingStore();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [userNickname, setUserNickname] = useState<string>("따뜻한 햇살"); // 기본값
  const [isLoadingProfile, setIsLoadingProfile] = useState<boolean>(true);
  const [isStartingMatching, setIsStartingMatching] = useState<boolean>(false);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState<boolean>(false);
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);

  // 사용자 프로필 정보 가져오기
  useEffect(() => {
    let mounted = true;
    const fetchUserProfile = async () => {
      try {
        setIsLoadingProfile(true);
        const profile = await getUserProfile();
        if (mounted) setUserNickname(profile.data.nickname);
      } catch (error) {
        console.error("사용자 프로필 가져오기 실패:", error);

        // 인증 만료 오류인 경우 기본값 유지 (로그인 페이지로 이동하지 않음)
        if (
          error instanceof Error &&
          error.message.includes("인증이 만료되었습니다")
        ) {
          console.warn("세션이 만료되었지만 기본 닉네임 유지");
        }
        // 에러가 발생해도 기본 닉네임 유지
      } finally {
        if (mounted) setIsLoadingProfile(false);
      }
    };

    fetchUserProfile();

    return () => {
      mounted = false;
    };
  }, []);

  // CATEGORIES 상수를 사용하여 카테고리 배열 생성
  const categories = Object.values(CATEGORIES).map((category) => ({
    id: category.id.toString(),
    name: category.name,
    icon:
      category.id === 0 ? (
        // 요청하기 버튼: + 아이콘 SVG
        <div className="w-full h-full flex items-center justify-center">
          <svg
            className="w-12 h-12 xs:w-10 xs:h-10"
            viewBox="0 0 64 64"
            fill="none"
            preserveAspectRatio="xMidYMid meet"
          >
            <circle cx="32" cy="32" r="30" fill="#FFDAB9" />
            <path
              d="M32 16V48M16 32H48"
              stroke="#EF4444"
              strokeWidth="6"
              strokeLinecap="round"
            />
          </svg>
        </div>
      ) : (
        // 일반 카테고리: 이미지 아이콘
        <div className="w-full h-full flex items-center justify-center">
          <img
            src={`/icons/${category.icon}`}
            alt={category.name}
            className="w-16 h-16 xs:w-12 xs:h-12 object-contain"
          />
        </div>
      ),
  }));

  const handleStartCall = async () => {
    if (!selectedCategory || isStartingMatching) return;

    try {
      if (import.meta.env.DEV) {
        console.log("🏠 HomePage: handleStartCall 호출됨");
        console.log("🏠 선택된 카테고리:", selectedCategory);
      }
      setIsStartingMatching(true);

      // 실제 매칭 API 호출
      if (import.meta.env.DEV) {
        console.log("🏠 실제 매칭 시작");
      }
      await startMatching({ category_id: parseInt(selectedCategory) });

      // 매칭 성공 시 연결 페이지로 이동
      if (import.meta.env.DEV) {
        console.log("🏠 ConnectingCallPage로 이동");
      }
      navigate("/connecting-call");
    } catch (error) {
      console.error("🏠 매칭 시작 실패:", error);
      // 에러는 matchingStore에서 관리됨
    } finally {
      setIsStartingMatching(false);
    }
  };

  const handleCategorySelect = (categoryId: string) => {
    // 요청하기 버튼 클릭 시
    if (categoryId === "0") {
      setIsRequestModalOpen(true);
      return;
    }
    setSelectedCategory(categoryId);
  };

  // 카테고리 요청 처리
  const handleCategoryRequest = async (categoryName: string) => {
    try {
      const token = getStoredToken();

      if (!token) {
        alert("로그인이 필요합니다.");
        return;
      }

      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
        ? String(import.meta.env.VITE_API_BASE_URL).replace(/\/$/, "")
        : "/api";

      const requestBody: CategoryRequest = {
        category_name: categoryName,
      };

      if (import.meta.env.DEV) {
        console.log("📤 카테고리 요청 전송:", requestBody);
      }

      const response = await fetch(`${API_BASE_URL}/v1/categories/request`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "카테고리 요청에 실패했습니다.");
      }

      const data = await response.json();

      if (import.meta.env.DEV) {
        console.log("✅ 카테고리 요청 성공:", data);
      }

      // 성공 모달 표시
      setShowSuccessModal(true);

      // 2초 후 모달 자동 닫기
      setTimeout(() => {
        setShowSuccessModal(false);
      }, 2000);
    } catch (error) {
      console.error("카테고리 요청 실패:", error);
      alert(
        error instanceof Error
          ? error.message
          : "요청 전송에 실패했습니다. 다시 시도해주세요.",
      );
      throw error; // 모달이 에러를 처리할 수 있도록
    }
  };

  const handleBottomNavClick = (item: BottomNavItem) => {
    switch (item) {
      case "home":
        navigate("/");
        break;
      case "friends":
        navigate("/friends");
        break;
      case "settings":
        navigate("/settings");
        break;
    }
  };

  // 현재 경로에 따라 activeItem 결정
  const getActiveItem = (): BottomNavItem => {
    if (location.pathname.startsWith("/friends")) {
      return "friends";
    } else if (location.pathname === "/settings") {
      return "settings";
    }
    return "home";
  };

  return (
    <div className="min-h-screen bg-grey-50 flex flex-col safe-area-page font-noto pb-20">
      {/* Category Request Modal */}
      <CategoryRequestModal
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        onSubmit={handleCategoryRequest}
      />

      {/* Success Message Modal */}
      {showSuccessModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="category-request-success-title"
          aria-describedby="category-request-success-desc"
        >
          <div className="bg-white rounded-lg p-6 mx-4 text-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-6 h-6 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h3
              id="category-request-success-title"
              className="text-lg font-semibold text-gray-900 mb-2"
            >
              카테고리 요청이 완료되었습니다!
            </h3>
            <p id="category-request-success-desc" className="text-gray-600">
              소중한 의견 감사합니다.
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-8 py-4">
        {/* Logo */}
        <div className="flex items-center">
          <h1 className="text-3xl font-bold text-black font-cafe24">
            강낭콩콜
          </h1>
        </div>

        {/* Right side buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate("/call-history")}
            className="px-3 py-1 border-2 border-orange-accent text-orange-accent font-crimson text-sm font-bold rounded hover:bg-orange-50 transition-colors"
          >
            통화 기록
          </button>
          <button
            type="button"
            onClick={onOpenSettings}
            className="p-3"
            title="설정"
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z"
                stroke="#EA8C4B"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M19.4 15C19.2669 15.3016 19.2272 15.6362 19.286 15.9606C19.3448 16.285 19.4995 16.5843 19.73 16.82L19.79 16.88C19.976 17.0657 20.1235 17.2863 20.2241 17.5291C20.3248 17.7719 20.3766 18.0322 20.3766 18.295C20.3766 18.5578 20.3248 18.8181 20.2241 19.0609C20.1235 19.3037 19.976 19.5243 19.79 19.71C19.6043 19.896 19.3837 20.0435 19.1409 20.1441C18.8981 20.2448 18.6378 20.2966 18.375 20.2966C18.1122 20.2966 17.8519 20.2448 17.6091 20.1441C17.3663 20.0435 17.1457 19.896 16.96 19.71L16.9 19.65C16.6643 19.4195 16.365 19.2648 16.0406 19.206C15.7162 19.1472 15.3816 19.1869 15.08 19.32C14.7842 19.4468 14.532 19.6572 14.3543 19.9255C14.1766 20.1938 14.0813 20.5082 14.08 20.83V21C14.08 21.5304 13.8693 22.0391 13.4942 22.4142C13.1191 22.7893 12.6104 23 12.08 23C11.5496 23 11.0409 22.7893 10.6658 22.4142C10.2907 22.0391 10.08 21.5304 10.08 21V20.91C10.0723 20.579 9.96512 20.258 9.77251 19.9887C9.5799 19.7194 9.31074 19.5143 9 19.4C8.69838 19.2669 8.36381 19.2272 8.03941 19.286C7.71502 19.3448 7.41568 19.4995 7.18 19.73L7.12 19.79C6.93425 19.976 6.71368 20.1235 6.47088 20.2241C6.22808 20.3248 5.96783 20.3766 5.705 20.3766C5.44217 20.3766 5.18192 20.3248 4.93912 20.2241C4.69632 20.1235 4.47575 19.976 4.29 19.79C4.10405 19.6043 3.95653 19.3837 3.85588 19.1409C3.75523 18.8981 3.70343 18.6378 3.70343 18.375C3.70343 18.1122 3.75523 17.8519 3.85588 17.6091C3.95653 17.3663 4.10405 17.1457 4.29 16.96L4.35 16.9C4.58054 16.6643 4.73519 16.365 4.794 16.0406C4.85282 15.7162 4.81312 15.3816 4.68 15.08C4.55324 14.7842 4.34276 14.532 4.07447 14.3543C3.80618 14.1766 3.49179 14.0813 3.17 14.08H3C2.46957 14.08 1.96086 13.8693 1.58579 13.4942C1.21071 13.1191 1 12.6104 1 12.08C1 11.5496 1.21071 11.0409 1.58579 10.6658C1.96086 10.2907 2.46957 10.08 3 10.08H3.09C3.42099 10.0723 3.742 9.96512 4.0113 9.77251C4.28059 9.5799 4.48572 9.31074 4.6 9C4.73312 8.69838 4.77282 8.36381 4.714 8.03941C4.65519 7.71502 4.50054 7.41568 4.27 7.18L4.21 7.12C4.02405 6.93425 3.87653 6.71368 3.77588 6.47088C3.67523 6.22808 3.62343 5.96783 3.62343 5.705C3.62343 5.44217 3.67523 5.18192 3.77588 4.93912C3.87653 4.69632 4.02405 4.47575 4.21 4.29C4.39575 4.10405 4.61632 3.95653 4.85912 3.85588C5.10192 3.75523 5.36217 3.70343 5.625 3.70343C5.88783 3.70343 6.14808 3.75523 6.39088 3.85588C6.63368 3.95653 6.85425 4.10405 7.04 4.29L7.1 4.35C7.33568 4.58054 7.63502 4.73519 7.95941 4.794C8.28381 4.85282 8.61838 4.81312 8.92 4.68H9C9.29577 4.55324 9.54802 4.34276 9.72569 4.07447C9.90337 3.80618 9.99872 3.49179 10 3.17V3C10 2.46957 10.2107 1.96086 10.5858 1.58579C10.9609 1.21071 11.4696 1 12 1C12.5304 1 13.0391 1.21071 13.4142 1.58579C13.7893 1.96086 14 2.46957 14 3V3.09C14.0013 3.41179 14.0966 3.72618 14.2743 3.99447C14.452 4.26276 14.7042 4.47324 15 4.6C15.3016 4.73312 15.6362 4.77282 15.9606 4.714C16.285 4.65519 16.5843 4.50054 16.82 4.27L16.88 4.21C17.0657 4.02405 17.2863 3.87653 17.5291 3.77588C17.7719 3.67523 18.0322 3.62343 18.295 3.62343C18.5578 3.62343 18.8181 3.67523 19.0609 3.77588C19.3037 3.87653 19.5243 4.02405 19.71 4.21C19.896 4.39575 20.0435 4.61632 20.1441 4.85912C20.2448 5.10192 20.2966 5.36217 20.2966 5.625C20.2966 5.88783 20.2448 6.14808 20.1441 6.39088C20.0435 6.63368 19.896 6.85425 19.71 7.04L19.65 7.1C19.4195 7.33568 19.2648 7.63502 19.206 7.95941C19.1472 8.28381 19.1869 8.61838 19.32 8.92V9C19.4468 9.29577 19.6572 9.54802 19.9255 9.72569C20.1938 9.90337 20.5082 9.99872 20.83 10H21C21.5304 10 22.0391 10.2107 22.4142 10.5858C22.7893 10.9609 23 11.4696 23 12C23 12.5304 22.7893 13.0391 22.4142 13.4142C22.0391 13.7893 21.5304 14 21 14H20.91C20.5882 14.0013 20.2738 14.0966 20.0055 14.2743C19.7372 14.452 19.5268 14.7042 19.4 15V15Z"
                stroke="#EA8C4B"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* User Info */}
      <div className="px-8 mb-6">
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
              className="flex items-center gap-1 px-3 py-1 bg-white border border-grey-100 rounded"
            >
              <span className="text-orange-accent font-crimson text-lg font-semibold">
                {isLoadingProfile ? "로딩 중..." : userNickname}
              </span>
            </button>
          </div>
          <span className="text-grey-900 font-crimson text-lg font-bold">
            님
          </span>
        </div>
      </div>

      {/* Description */}
      <div className="px-8 mb-8">
        <h2 className="text-grey-900 font-crimson text-xl font-bold">
          관심사를 선택해 통화를 시작해보세요!
        </h2>
      </div>

      {/* Categories Grid */}
      <div className="px-8">
        <div className="grid grid-cols-2 gap-6 mb-8">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => handleCategorySelect(category.id)}
              disabled={isStartingMatching}
              className={`relative h-32 border border-grey-100 rounded-2xl flex items-center justify-center px-4 xs:px-2 overflow-hidden transition-colors hover:shadow-md ${
                category.id === "0" ? "bg-orange-50" : "bg-white"
              } ${
                selectedCategory === category.id
                  ? "border-orange-accent bg-orange-accent/5"
                  : ""
              } ${isStartingMatching ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <div
                className={`flex items-center justify-center ${
                  category.id === "0" || category.id === "5"
                    ? "gap-1"
                    : "gap-3 xs:justify-between xs:w-full"
                }`}
              >
                <span
                  className={`text-grey-900 font-crimson text-2xl xs:text-1.5xl font-bold whitespace-nowrap text-center ${
                    category.id === "0" || category.id === "5" ? "pl-1" : "pl-4"
                  }`}
                >
                  {category.name}
                </span>
                <div
                  className={`w-20 xs:w-16 flex items-center justify-center flex-shrink-0 ${
                    category.id === "0" || category.id === "5" ? "pr-1" : "pr-4"
                  }`}
                >
                  {category.icon}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="px-8 mb-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-600 font-crimson text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Subscription Section */}
      {/* <div className="px-8 mb-8">
        <div className="relative bg-orange-subscription rounded-2xl p-8 flex items-center justify-between">
          <div>
            <p className="text-white font-crimson text-lg font-bold leading-6">
              구독을 통해
              <br />
              무제한 통화를 시작해보세요
            </p>
          </div>
          <div className="text-5xl">🔗</div>
        </div>
      </div> */}

      {/* Start Call Button */}
      <div className="px-8 pb-12">
        <div className="h-24 relative">
          <button
            onClick={handleStartCall}
            disabled={!selectedCategory || isStartingMatching}
            className={`w-full h-16 rounded-lg font-crimson text-2xl font-semibold text-white transition-all ${
              selectedCategory && !isStartingMatching
                ? "bg-gradient-to-r from-yellow-300 to-red-gradient shadow-lg"
                : "bg-gray-400 opacity-50 cursor-not-allowed"
            }`}
          >
            {isStartingMatching ? "매칭 중..." : "통화 시작"}
          </button>
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation
        activeItem={getActiveItem()}
        onItemClick={handleBottomNavClick}
      />
    </div>
  );
}
