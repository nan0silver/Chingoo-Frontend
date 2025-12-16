import { useNavigate, useLocation } from "react-router-dom";
import BottomNavigation, { BottomNavItem } from "@/components/BottomNavigation";

interface SupportPageProps {
  onBack: () => void;
}

export default function SupportPage({ onBack }: SupportPageProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const email = "chingoohaja@gmail.com";

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(email);
    alert("이메일이 클립보드에 복사되었습니다!");
  };

  const handleSendEmail = () => {
    window.location.href = `mailto:${email}`;
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
    // SupportPage는 설정 페이지에서 접근하므로 항상 "settings" 활성화
    return "settings";
  };

  return (
    <div className="min-h-screen bg-white flex flex-col safe-area-page font-noto pb-20">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <button onClick={() => navigate("/settings")} className="p-1">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
              d="M15 18L9 12L15 6"
              stroke="black"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <h1 className="text-gray-800 font-crimson text-lg font-bold">
          고객센터
        </h1>
        <div className="w-6" />
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-8">
        <div className="text-center w-full max-w-md">
          {/* Icon */}
          <div className="mb-8">
            <div className="w-32 h-32 mx-auto bg-orange-100 rounded-full flex items-center justify-center">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
                <path
                  d="M20 4H4C2.9 4 2.01 4.9 2.01 6L2 18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V6C22 4.9 21.1 4 20 4ZM20 8L12 13L4 8V6L12 11L20 6V8Z"
                  fill="#EA8C4B"
                />
              </svg>
            </div>
          </div>

          {/* Title */}
          <h2 className="text-gray-900 font-crimson text-3xl font-bold mb-4">
            문의하기
          </h2>

          {/* Description */}
          <p className="text-gray-600 font-pretendard text-lg leading-relaxed mb-8">
            궁금한 점이나 불편한 사항이 있으신가요?
            <br />
            언제든지 편하게 문의해주세요.
          </p>

          {/* Email Display */}
          <div className="bg-orange-50 border border-orange-100 rounded-2xl p-6 mb-6">
            <p className="text-gray-700 font-pretendard text-sm mb-3">
              이메일 주소
            </p>
            <div className="flex items-center justify-center gap-2 mb-4">
              <p className="text-orange-600 font-crimson text-xl font-bold">
                {email}
              </p>
              <button
                onClick={handleCopyEmail}
                className="p-2 hover:bg-orange-100 rounded-lg transition-colors"
                title="복사"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#EA8C4B"
                  strokeWidth="2"
                >
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
              </button>
            </div>
            <p className="text-gray-500 font-pretendard text-sm">
              최대한 빠르게 답변드리겠습니다. 💌
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleSendEmail}
              className="w-full h-14 bg-gradient-to-r from-yellow-300 to-red-gradient text-white font-crimson text-xl font-semibold rounded-lg hover:opacity-90 transition-opacity"
            >
              이메일 보내기
            </button>
          </div>

          {/* Additional Info */}
          <div className="mt-8">
            <p className="text-gray-500 font-pretendard text-sm leading-relaxed">
              📧 이메일 답변 시간: 평일 09:00 - 18:00
              <br />
              (주말 및 공휴일 제외)
            </p>
          </div>
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
