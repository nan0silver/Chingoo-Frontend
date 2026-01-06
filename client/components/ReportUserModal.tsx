import { useState } from "react";
import { ReportReason, ReportUserRequest } from "@shared/api";

interface ReportUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (request: ReportUserRequest) => Promise<void>;
  reportedUserNickname?: string;
}

const REPORT_REASONS: Array<{
  value: ReportReason;
  label: string;
  description?: string;
}> = [
  {
    value: "INAPPROPRIATE_LANGUAGE",
    label: "부적절한 언어 사용",
    description: "욕설, 비속어 등을 사용했습니다",
  },
  {
    value: "HARASSMENT",
    label: "괴롭힘",
    description: "지속적인 괴롭힘이나 모욕을 받았습니다",
  },
  {
    value: "SPAM",
    label: "스팸/광고",
    description: "스팸 메시지나 광고를 보냈습니다",
  },
  {
    value: "INAPPROPRIATE_CONTENT",
    label: "부적절한 내용",
    description: "부적절하거나 불쾌한 내용을 말했습니다",
  },
  {
    value: "OFFENSIVE_BEHAVIOR",
    label: "불쾌한 행동",
    description: "불쾌하거나 공격적인 행동을 했습니다",
  },
  {
    value: "PRIVACY_VIOLATION",
    label: "개인정보 침해",
    description: "개인정보를 요구하거나 침해했습니다",
  },
  {
    value: "OTHER",
    label: "기타",
    description: "기타 사유",
  },
];

export default function ReportUserModal({
  isOpen,
  onClose,
  onSubmit,
  reportedUserNickname,
}: ReportUserModalProps) {
  const [selectedReason, setSelectedReason] = useState<ReportReason | null>(
    null,
  );
  const [details, setDetails] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!selectedReason) {
      alert("신고 사유를 선택해주세요.");
      return;
    }

    if (details.length > 500) {
      alert("상세 내용은 500자 이하로 입력해주세요.");
      return;
    }

    setIsSubmitting(true);
    try {
      const request: ReportUserRequest = {
        reason: selectedReason,
        details: details.trim() || undefined,
      };

      await onSubmit(request);
      // 성공 시 상태 초기화
      setSelectedReason(null);
      setDetails("");
      onClose();
    } catch (error) {
      console.error("사용자 신고 실패:", error);
      // 에러는 상위 컴포넌트에서 처리
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setSelectedReason(null);
      setDetails("");
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4"
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-2xl p-6 md:p-8 max-w-md w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl md:text-2xl font-crimson font-bold text-gray-900 mb-2">
          사용자 신고하기
        </h2>
        {reportedUserNickname && (
          <p className="text-gray-600 font-pretendard text-sm md:text-base mb-6">
            <span className="font-semibold">{reportedUserNickname}</span>님을
            신고하시겠습니까?
          </p>
        )}

        {/* 신고 사유 선택 */}
        <div className="mb-6">
          <label className="block text-gray-900 font-crimson text-base font-semibold mb-3">
            신고 사유 <span className="text-red-500">*</span>
          </label>
          <div className="space-y-2">
            {REPORT_REASONS.map((reason) => (
              <label
                key={reason.value}
                className={`flex items-start gap-3 p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                  selectedReason === reason.value
                    ? "border-orange-500 bg-orange-50"
                    : "border-gray-300 bg-white hover:bg-gray-50"
                } ${isSubmitting ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <input
                  type="radio"
                  name="reportReason"
                  value={reason.value}
                  checked={selectedReason === reason.value}
                  onChange={() => setSelectedReason(reason.value)}
                  disabled={isSubmitting}
                  className="mt-1 w-4 h-4 text-orange-500 focus:ring-orange-500 focus:ring-2"
                />
                <div className="flex-1">
                  <div className="text-gray-900 font-pretendard text-sm font-medium">
                    {reason.label}
                  </div>
                  {reason.description && (
                    <div className="text-gray-500 font-pretendard text-xs mt-1">
                      {reason.description}
                    </div>
                  )}
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* 상세 내용 입력 */}
        <div className="mb-6">
          <label className="block text-gray-900 font-crimson text-base font-semibold mb-2">
            상세 내용 (선택)
          </label>
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="신고 사유에 대한 상세 내용을 입력해주세요. (최대 500자)"
            maxLength={500}
            disabled={isSubmitting}
            rows={4}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg font-pretendard text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed resize-none"
          />
          <div className="text-right text-gray-400 font-pretendard text-xs mt-1">
            {details.length}/500
          </div>
        </div>

        {/* 안내 메시지 */}
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-6">
          <p className="text-orange-800 font-pretendard text-xs">
            신고된 사용자와는 더 이상 랜덤 매칭되지 않으며, 기존 친구 관계도
            자동으로 차단됩니다.
          </p>
        </div>

        {/* 버튼 */}
        <div className="flex gap-3">
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="flex-1 py-3 border-2 border-gray-300 text-gray-700 font-crimson text-lg font-semibold rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !selectedReason}
            className="flex-1 py-3 bg-gradient-to-r from-yellow-300 to-red-gradient text-white font-crimson text-lg font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "신고 중..." : "신고하기"}
          </button>
        </div>
      </div>
    </div>
  );
}

