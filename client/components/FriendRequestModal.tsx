import { useState } from "react";
import { X } from "lucide-react";

interface FriendRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (nickname: string) => Promise<void>;
}

export default function FriendRequestModal({
  isOpen,
  onClose,
  onSubmit,
}: FriendRequestModalProps) {
  const [nickname, setNickname] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!nickname.trim()) {
      setError("닉네임을 입력해주세요.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit(nickname.trim());
      setNickname("");
      onClose();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "친구 요청을 보낼 수 없습니다.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setNickname("");
      setError(null);
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="friend-request-modal-title"
    >
      <div
        className="bg-white rounded-2xl p-6 mx-4 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2
            id="friend-request-modal-title"
            className="text-2xl font-bold text-grey-900 font-cafe24"
          >
            친구 요청
          </h2>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="p-1 hover:bg-grey-50 rounded transition-colors"
            aria-label="닫기"
          >
            <X className="w-6 h-6 text-grey-400" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label
              htmlFor="nickname"
              className="block text-grey-900 font-crimson text-lg font-semibold mb-2"
            >
              친구 닉네임
            </label>
            <input
              id="nickname"
              type="text"
              value={nickname}
              onChange={(e) => {
                setNickname(e.target.value);
                setError(null);
              }}
              placeholder="닉네임을 입력해주세요"
              disabled={isSubmitting}
              className="w-full h-12 px-4 border border-grey-100 rounded-lg font-noto text-lg placeholder:text-text-placeholder text-grey-900 focus:outline-none focus:ring-2 focus:ring-orange-accent focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              autoFocus
            />
            {error && (
              <p className="mt-2 text-red-600 font-crimson text-sm">{error}</p>
            )}
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="flex-1 h-12 border-2 border-grey-100 text-grey-900 font-crimson text-lg font-semibold rounded-lg hover:bg-grey-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !nickname.trim()}
              className="flex-1 h-12 bg-orange-accent text-white font-crimson text-lg font-semibold rounded-lg hover:bg-opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "전송 중..." : "요청 보내기"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

