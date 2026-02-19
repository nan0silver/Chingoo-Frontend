import { useState } from "react";

interface CategoryRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (categoryName: string) => Promise<void>;
}

export default function CategoryRequestModal({
  isOpen,
  onClose,
  onSubmit,
}: CategoryRequestModalProps) {
  const [categoryName, setCategoryName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!categoryName.trim()) {
      alert("카테고리 이름을 입력해주세요.");
      return;
    }

    if (categoryName.trim().length < 2) {
      alert("카테고리 이름은 최소 2글자 이상 입력해주세요.");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(categoryName.trim());
      setCategoryName("");
      onClose();
    } catch (error) {
      console.error("카테고리 요청 실패:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setCategoryName("");
      onClose();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isSubmitting) {
      handleSubmit();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] px-4"
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-2xl p-6 md:p-8 max-w-app w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl md:text-2xl font-crimson font-bold text-gray-900 mb-3">
          카테고리 요청하기
        </h2>
        <p className="text-gray-600 font-pretendard text-sm md:text-base mb-6">
          원하시는 대화 주제를 알려주세요.
          <br />
          여러분의 의견을 반영하여 새로운 카테고리를 추가하겠습니다.
        </p>

        <input
          type="text"
          value={categoryName}
          onChange={(e) => setCategoryName(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="예: 반려동물, 운동, 독서, 영화 등"
          maxLength={20}
          disabled={isSubmitting}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg font-pretendard text-base focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed mb-6"
        />

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
            disabled={isSubmitting || !categoryName.trim()}
            className="flex-1 py-3 bg-gradient-to-r from-yellow-300 to-red-gradient text-white font-crimson text-lg font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "전송 중..." : "요청하기"}
          </button>
        </div>
      </div>
    </div>
  );
}
