import { useState, useEffect } from "react";
import { useCall } from "@/lib/useCall";

interface CallEvaluationPageProps {
  selectedCategory: string | null;
  onCallAgain: () => void;
  onSelectInterests: () => void;
}

export default function CallEvaluationPage({
  selectedCategory,
  onCallAgain,
  onSelectInterests,
}: CallEvaluationPageProps) {
  const [selectedRating, setSelectedRating] = useState<"good" | "bad" | null>(
    null,
  );
  const { partner, clearPartner } = useCall();

  // 디버깅: partner 정보 확인
  useEffect(() => {
    console.log("🔍 CallEvaluationPage - partner 정보:", partner);
  }, [partner]);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="flex justify-center mt-8">
        <h1 className="text-orange-500 font-crimson text-2xl font-bold">
          통화를 평가해주세요
        </h1>
      </div>

      {/* Title Container */}
      <div className="flex flex-col items-center justify-center mt-8 gap-3">
        <div className="flex items-center gap-1">
          <span className="text-gray-900 font-crimson text-4xl font-bold">
            {partner?.nickname || "상대방"}
          </span>
          <span className="text-gray-900 font-pretendard text-4xl font-normal">
            님과의
          </span>
        </div>
        <span className="text-gray-900 font-pretendard text-4xl font-normal">
          통화는 어땠나요?
        </span>
      </div>

      {/* Rating Options */}
      <div className="flex gap-4 px-5 mt-12">
        {/* Bad Rating */}
        <button
          onClick={() => setSelectedRating("bad")}
          className={`flex-1 h-36 rounded-2xl border flex flex-col items-center justify-center gap-2 transition-all ${
            selectedRating === "bad"
              ? "border-orange-400 bg-orange-50"
              : "border-gray-300 bg-gray-100"
          }`}
        >
          <svg width="60" height="60" viewBox="0 0 60 60" fill="none">
            <path
              d="M7.5 40C6.16667 40 5 39.5 4 38.5C3 37.5 2.5 36.3333 2.5 35V30C2.5 29.7083 2.53125 29.3958 2.59375 29.0625C2.65625 28.7292 2.75 28.4167 2.875 28.125L10.375 10.5C10.75 9.66667 11.375 8.95833 12.25 8.375C13.125 7.79167 14.0417 7.5 15 7.5H35C36.375 7.5 37.5521 7.98958 38.5312 8.96875C39.5104 9.94792 40 11.125 40 12.5V37.9375C40 38.6042 39.8646 39.2396 39.5938 39.8438C39.3229 40.4479 38.9583 40.9792 38.5 41.4375L24.9375 54.9375C24.3125 55.5208 23.5729 55.875 22.7188 56C21.8646 56.125 21.0417 55.9792 20.25 55.5625C19.4583 55.1458 18.8854 54.5625 18.5312 53.8125C18.1771 53.0625 18.1042 52.2917 18.3125 51.5L21.125 40H7.5ZM50 7.5C51.375 7.5 52.5521 7.98958 53.5312 8.96875C54.5104 9.94792 55 11.125 55 12.5V35C55 36.375 54.5104 37.5521 53.5312 38.5313C52.5521 39.5104 51.375 40 50 40C48.625 40 47.4479 39.5104 46.4688 38.5313C45.4896 37.5521 45 36.375 45 35V12.5C45 11.125 45.4896 9.94792 46.4688 8.96875C47.4479 7.98958 48.625 7.5 50 7.5Z"
              fill="url(#paint0_radial_bad)"
            />
            <defs>
              <radialGradient
                id="paint0_radial_bad"
                cx="0"
                cy="0"
                r="1"
                gradientTransform="matrix(36 -44 104.92 102.906 15.5 59.5)"
                gradientUnits="userSpaceOnUse"
              >
                <stop stopColor="#5D5D5D" />
                <stop offset="1" stopColor="#9E9B9B" />
              </radialGradient>
            </defs>
          </svg>
          <span className="text-gray-900 font-crimson text-2xl font-bold">
            별로였어요
          </span>
        </button>

        {/* Good Rating */}
        <button
          onClick={() => setSelectedRating("good")}
          className={`flex-1 h-36 rounded-2xl border flex flex-col items-center justify-center gap-2 transition-all ${
            selectedRating === "good"
              ? "border-orange-400 bg-orange-50"
              : "border-gray-300 bg-gray-100"
          }`}
        >
          <svg width="60" height="60" viewBox="0 0 60 60" fill="none">
            <path
              d="M27.3539 51.2033C28.9615 52.2656 31.037 52.2656 32.6446 51.2033C37.7481 47.8307 48.8704 39.7751 53.6589 30.7582C59.9748 18.8635 52.558 7 42.7566 7C37.1687 7 33.8065 9.91945 31.9478 12.4288C30.9687 13.7511 29.0328 13.7511 28.0522 12.4288C26.1935 9.91945 22.8313 7 17.2434 7C7.44202 7 0.0252047 18.8635 6.34108 30.7582C11.1281 39.7736 22.2504 47.8307 27.3539 51.2033Z"
              fill="url(#paint0_radial_good)"
            />
            <defs>
              <radialGradient
                id="paint0_radial_good"
                cx="0"
                cy="0"
                r="1"
                gradientTransform="matrix(-18.5 26.5 -68.601 -50.7338 45.5 16.5)"
                gradientUnits="userSpaceOnUse"
              >
                <stop stopColor="#E35241" />
                <stop offset="1" stopColor="#FF8B76" />
              </radialGradient>
            </defs>
          </svg>
          <span className="text-gray-900 font-crimson text-2xl font-bold">
            좋았어요
          </span>
        </button>
      </div>

      {/* Privacy Note */}
      <div className="flex justify-center mt-8">
        <p className="text-gray-500 font-crimson text-xl">
          평가는 상대방에게 공개되지 않아요
        </p>
      </div>

      {/* Submit Rating Button */}
      <div className="flex justify-center mt-6 px-5">
        <button
          onClick={() => {
            if (selectedRating) {
              // TODO: 실제 평가 제출 로직 구현
              console.log("평가 제출:", selectedRating);
              alert(
                `평가가 제출되었습니다: ${selectedRating === "good" ? "좋았어요" : "별로였어요"}`,
              );

              // 평가 제출 후 partner 정보 삭제
              clearPartner();
              console.log("✅ 평가 제출 후 partner 정보 삭제 완료");
            }
          }}
          disabled={!selectedRating}
          className={`w-full max-w-sm h-14 rounded-lg font-crimson text-xl font-bold transition-all ${
            selectedRating
              ? "bg-gradient-to-r from-yellow-300 to-red-gradient text-white hover:opacity-90"
              : "bg-gray-300 text-gray-500 cursor-not-allowed"
          }`}
        >
          평가 제출하기
        </button>
      </div>

      {/* Buttons Container */}
      <div className="flex-1 flex items-end pb-8">
        <div className="w-full px-5">
          <div className="flex gap-2">
            {/* Call Again Button */}
            <button
              onClick={() => {
                // 다시 통화하기 전에 partner 정보 삭제
                clearPartner();
                console.log("✅ 다시 통화하기 - partner 정보 삭제 완료");
                onCallAgain();
              }}
              className="flex-1 h-14 border border-orange-500 rounded-lg flex items-center justify-center bg-white"
            >
              <span className="text-orange-500 font-crimson text-xl font-bold">
                다시 통화하기
              </span>
            </button>

            {/* Select Interests Button */}
            <button
              onClick={() => {
                // 관심사 선택 전에 partner 정보 삭제
                clearPartner();
                console.log("✅ 관심사 선택 - partner 정보 삭제 완료");
                onSelectInterests();
              }}
              className="flex-1 h-14 bg-orange-500 rounded-lg flex items-center justify-center"
            >
              <span className="text-white font-crimson text-xl font-bold">
                관심사 선택
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
