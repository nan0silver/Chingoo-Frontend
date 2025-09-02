import { useState } from "react";

interface SignUpPageProps {
  onBack: () => void;
  onSignUp: () => void;
}

export default function SignUpPage({ onBack, onSignUp }: SignUpPageProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleSignUp = () => {
    if (username.trim() && password.trim()) {
      // Simulate signup success
      onSignUp();
    } else {
      alert("아이디와 비밀번호를 입력해주세요.");
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <button onClick={onBack} className="p-1">
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
          회원가입
        </h1>
        <div className="w-6" />
      </div>

      {/* Content */}
      <div className="flex-1 px-5 py-5">
        {/* Description */}
        <div className="mb-8">
          <h2 className="text-black font-crimson text-2xl font-bold leading-8">
            서비스 이용을 위해
            <br />
            가입이 필요해요
          </h2>
        </div>

        {/* Form */}
        <div className="space-y-6">
          {/* Username Field */}
          <div className="space-y-2">
            <label className="text-gray-700 font-pretendard text-xl">
              아이디
            </label>
            <div className="relative">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="아이디를 입력해주세요"
                className="w-full h-14 px-4 border border-gray-200 rounded-lg font-crimson text-xl placeholder:text-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="space-y-2">
            <label className="text-gray-700 font-pretendard text-xl">
              비밀번호
            </label>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호를 입력해주세요"
                className="w-full h-14 px-4 border border-gray-200 rounded-lg font-crimson text-xl placeholder:text-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Sign Up Button */}
      <div className="px-5 pb-8">
        <button
          onClick={handleSignUp}
          className="w-full h-14 bg-orange-500 text-white font-crimson text-xl font-bold rounded-lg hover:bg-orange-600 transition-colors"
        >
          가입하기
        </button>
      </div>
    </div>
  );
}
