import { useState } from "react";

export default function Index() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = () => {
    // Handle login logic here
    console.log("Login attempt:", { username, password });
  };

  const handleSocialLogin = (provider: string) => {
    // Handle social login
    console.log(`Login with ${provider}`);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center">
      {/* Status Bar */}
      <div className="w-full max-w-sm relative">
        <div className="flex justify-between items-center px-6 py-3 h-11">
          <span className="text-black text-lg font-medium">9:41</span>
          <div className="flex items-center gap-1">
            {/* Signal bars */}
            <div className="flex gap-1">
              <div className="w-1 h-4 bg-black rounded-sm"></div>
              <div className="w-1 h-3 bg-black rounded-sm"></div>
              <div className="w-1 h-5 bg-black rounded-sm"></div>
              <div className="w-1 h-2 bg-black rounded-sm"></div>
            </div>
            {/* WiFi icon */}
            <svg width="15" height="11" viewBox="0 0 15 11" fill="none" className="ml-2">
              <path d="M7.5 3.5C10.5 3.5 13 5.5 13 8H12C12 6.5 9.5 5 7.5 5S3 6.5 3 8H2C2 5.5 4.5 3.5 7.5 3.5Z" fill="black"/>
            </svg>
            {/* Battery */}
            <div className="ml-2 w-6 h-3 border border-black rounded-sm relative">
              <div className="absolute inset-0.5 bg-black rounded-sm"></div>
              <div className="absolute -right-1 top-1 w-0.5 h-1 bg-black rounded-r"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Logo */}
      <div className="mt-4 mb-8">
        <svg width="103" height="32" viewBox="0 0 103 32" fill="none">
          <path d="M77.7015 8.50968V5.22002H91.1165V8.50968H86.4656V10.9904C86.4656 12.1229 86.358 13.1206 86.143 14.0374C87.3527 15.6822 90.1218 18.2439 92.1111 19.2955L90.5519 22.666C88.7776 21.7492 86.3043 19.5921 84.7719 17.4619C84.4493 18.0012 84.0998 18.5135 83.7234 19.0528C82.7019 20.5089 80.4168 22.666 78.8844 23.448L76.6799 20.3471C77.5671 19.8887 79.0995 18.6753 80.1748 17.4619C81.8954 15.5474 82.5406 13.7408 82.5406 11.1252V8.50968H77.7015ZM93.6435 4.06055H97.5416V12.3386H101.117V16.0328H97.5416V27.223H93.6435V4.06055Z" fill="black"/>
          <path d="M59.194 12.0688C63.0115 12.0688 65.7805 14.4956 65.7805 18.1358C65.7805 21.776 63.0115 24.1759 59.194 24.1759C55.3496 24.1759 52.6344 21.803 52.6344 18.1358C52.6344 14.4956 55.3496 12.0688 59.194 12.0688ZM68.3613 27.2229V4.06039H72.2595V12.5542H75.835V16.2483H72.2595V27.2229H68.3613ZM51.5859 7.40398H57.3659L56.9627 3.97949H61.6135L61.2103 7.40398H66.7752V10.6667H51.5859V7.40398ZM59.194 15.0889C57.4197 15.0889 56.2099 16.2214 56.2099 18.1358C56.2099 20.0773 57.4197 21.1559 59.194 21.1559C60.9683 21.1559 62.1781 20.0503 62.1781 18.1358C62.1781 16.2214 60.9683 15.0889 59.194 15.0889Z" fill="black"/>
          <path d="M26.5189 16.491H41.1436C41.4393 15.2776 41.7351 13.3631 41.9233 11.4486C42.0308 10.3431 42.0846 8.99485 42.1114 7.75448H29.2611V4.41089H46.1709C46.1978 6.97251 46.1171 9.02181 45.902 11.152C45.6601 13.1474 45.1762 15.2506 44.7729 16.491H49.2894V19.8346H39.9339V28.2205H35.7669V19.8346H26.5189V16.491Z" fill="black"/>
          <path d="M7.0167 3.35938H11.56L11.2643 6.13672H15.8614V9.39942H11.2374V10.0196C11.2374 10.6667 11.1299 11.2869 10.9417 11.8801C12.5816 13.0935 15.0011 14.253 16.3991 14.6575L15.4582 18.028C13.7107 17.6236 11.103 16.1405 9.38246 14.6036C9.05985 15.008 8.68348 15.3855 8.30711 15.763C6.88228 17.1382 4.78535 18.3786 3.0648 18.8639L1.80127 15.4664C2.82285 15.0889 4.3821 14.3609 5.43056 13.498C6.77474 12.3925 7.3393 11.3678 7.3393 10.0196V9.39942H2.47336V6.13672H7.28553L7.0167 3.35938ZM9.62441 19.565V24.5534H22.7974V27.9779H5.67251V19.565H9.62441ZM18.5767 4.06045H22.4748V20.8593H18.5767V4.06045Z" fill="black"/>
        </svg>
      </div>

      {/* Form Container */}
      <div className="w-full max-w-sm px-5 space-y-4">
        {/* Username Input */}
        <div className="relative">
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="아이디를 입력해주세요"
            className="w-full h-12 px-4 border border-border-gray rounded-lg font-crimson text-lg placeholder:text-text-placeholder text-gray-900 focus:outline-none focus:ring-2 focus:ring-login-button focus:border-transparent"
          />
        </div>

        {/* Password Input */}
        <div className="relative">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호를 입력해주세요"
            className="w-full h-12 px-4 border border-border-gray rounded-lg font-crimson text-lg placeholder:text-text-placeholder text-gray-900 focus:outline-none focus:ring-2 focus:ring-login-button focus:border-transparent"
          />
        </div>

        {/* Login Button */}
        <div className="pt-4">
          <button
            onClick={handleLogin}
            className="w-full h-14 bg-login-button text-white font-crimson text-xl font-bold rounded-lg hover:bg-opacity-90 transition-colors"
          >
            로그인
          </button>
        </div>

        {/* Links */}
        <div className="flex items-center justify-center gap-4 pt-4">
          <button className="text-text-gray font-pretendard text-lg underline hover:text-gray-600">
            회원가입
          </button>
          <div className="w-px h-4 bg-divider"></div>
          <button className="text-text-gray font-pretendard text-lg underline hover:text-gray-600">
            비밀번호 찾기
          </button>
        </div>

        {/* Social Login Divider */}
        <div className="flex items-center justify-center pt-8 pb-4">
          <div className="flex-1 h-px bg-border-gray"></div>
          <span className="px-4 text-text-gray font-crimson text-base">간편 로그인</span>
          <div className="flex-1 h-px bg-border-gray"></div>
        </div>

        {/* Social Login Buttons */}
        <div className="space-y-3">
          {/* Kakao Button */}
          <button
            onClick={() => handleSocialLogin('kakao')}
            className="w-full h-12 bg-kakao border border-border-gray rounded-lg flex items-center justify-center gap-2 hover:bg-opacity-90 transition-colors"
          >
            <img 
              src="https://api.builder.io/api/v1/image/assets/TEMP/4c65144d6cea6e4262f91c38a6a5875303193496?width=48" 
              alt="Kakao"
              className="w-6 h-6"
            />
            <span className="text-gray-800 font-crimson text-base font-bold">카카오로 로그인</span>
          </button>

          {/* Naver Button */}
          <button
            onClick={() => handleSocialLogin('naver')}
            className="w-full h-12 bg-naver border border-border-gray rounded-lg flex items-center justify-center gap-2 hover:bg-opacity-90 transition-colors"
          >
            <svg width="24" height="24" viewBox="0 0 25 24" fill="none">
              <path d="M19.5 5V19H14.4664L9.53356 11.9517V19H4.5V5H9.53356L14.4664 12.33V5H19.5Z" fill="white"/>
            </svg>
            <span className="text-gray-800 font-crimson text-base font-bold">네이버로 로그인</span>
          </button>

          {/* Google Button */}
          <button
            onClick={() => handleSocialLogin('google')}
            className="w-full h-12 bg-white border border-border-gray rounded-lg flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M11.9977 10.3621V13.8467H16.8402C16.6276 14.9674 15.9895 15.9163 15.0324 16.5543L17.9527 18.8202C19.6541 17.2497 20.6357 14.9429 20.6357 12.2026C20.6357 11.5646 20.5785 10.9511 20.4721 10.3622L11.9977 10.3621Z" fill="#4285F4"/>
              <path d="M6.95517 13.7107L6.29655 14.2149L3.96521 16.0308C5.44578 18.9674 8.48034 20.9961 11.9977 20.9961C14.4271 20.9961 16.4639 20.1944 17.9527 18.8202L15.0324 16.5543C14.2308 17.0942 13.2083 17.4214 11.9977 17.4214C9.65824 17.4214 7.67056 15.8427 6.95885 13.7159L6.95517 13.7107Z" fill="#34A853"/>
              <path d="M3.96517 7.96533C3.3517 9.17592 3 10.542 3 11.998C3 13.454 3.3517 14.8201 3.96517 16.0307C3.96517 16.0388 6.9591 13.7076 6.9591 13.7076C6.77914 13.1677 6.67277 12.5951 6.67277 11.9979C6.67277 11.4007 6.77914 10.8281 6.9591 10.2883L3.96517 7.96533Z" fill="#FBBC05"/>
              <path d="M11.9979 6.58283C13.3231 6.58283 14.501 7.0409 15.4417 7.92435L18.0183 5.34769C16.4559 3.89167 14.4274 3 11.9979 3C8.48052 3 5.44578 5.02045 3.96521 7.96526L6.95905 10.2884C7.67066 8.16156 9.65842 6.58283 11.9979 6.58283Z" fill="#EA4335"/>
            </svg>
            <span className="text-gray-800 font-crimson text-base font-bold">구글로 로그인</span>
          </button>
        </div>
      </div>
    </div>
  );
}
