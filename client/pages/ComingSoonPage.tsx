import { useNavigate, useLocation } from "react-router-dom";

interface ComingSoonPageProps {
  featureName?: string;
  onBack?: () => void;
}

export default function ComingSoonPage({
  featureName: propFeatureName,
  onBack,
}: ComingSoonPageProps) {
  const navigate = useNavigate();
  const location = useLocation();

  // URL 파라미터에서 기능 이름 가져오기 (prop이 없을 경우)
  const params = new URLSearchParams(location.search);
  const urlFeatureName = params.get("feature");
  const featureName = propFeatureName || urlFeatureName || "이 기능";

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col safe-area-page">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <button onClick={handleBack} className="p-1">
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
          {featureName}
        </h1>
        <div className="w-6" />
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-8">
        <div className="text-center">
          {/* Icon */}
          <div className="mb-8">
            <div className="w-32 h-32 mx-auto bg-orange-100 rounded-full flex items-center justify-center">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM13 17H11V15H13V17ZM13 13H11V7H13V13Z"
                  fill="#EA8C4B"
                />
              </svg>
            </div>
          </div>

          {/* Title */}
          <h2 className="text-gray-900 font-crimson text-3xl font-bold mb-4">
            준비 중입니다
          </h2>

          {/* Description */}
          <p className="text-gray-600 font-pretendard text-lg leading-relaxed mb-2">
            {featureName}은(는) 현재 준비 중입니다.
          </p>
          <p className="text-gray-600 font-pretendard text-lg leading-relaxed mb-8">
            빠른 시일 내에 업데이트 예정입니다.
          </p>

          {/* Additional Info */}
          <div className="bg-orange-50 border border-orange-100 rounded-2xl p-6 mb-8">
            <p className="text-orange-600 font-pretendard text-base leading-relaxed">
              더 나은 서비스를 제공하기 위해
              <br />
              열심히 개발하고 있습니다. 🚀
            </p>
          </div>

          {/* Back Button */}
          <button
            onClick={handleBack}
            className="w-full max-w-sm h-14 bg-gradient-to-r from-yellow-300 to-red-gradient text-white font-crimson text-xl font-semibold rounded-lg hover:opacity-90 transition-opacity"
          >
            돌아가기
          </button>
        </div>
      </div>
    </div>
  );
}
