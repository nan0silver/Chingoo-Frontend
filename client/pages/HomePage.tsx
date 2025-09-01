import { useState } from "react";

interface HomePageProps {
  onLogout: () => void;
}

export default function HomePage({ onLogout }: HomePageProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);

  const categories = [
    {
      id: "hobby",
      name: "취미",
      icon: (
        <div className="w-20 h-20 flex items-center justify-center">
          <div className="relative">
            <div className="w-12 h-8 bg-amber-600 rounded-lg"></div>
            <div className="absolute -top-2 left-3 w-6 h-6 bg-green-400 rounded-full"></div>
            <div className="absolute -top-4 left-4 w-4 h-6 bg-green-500 rounded-t-full"></div>
            <div className="absolute -top-3 left-6 w-3 h-4 bg-green-600 rounded-t-full"></div>
            <div className="absolute top-2 right-1 w-6 h-6 bg-gray-400 rounded-full"></div>
          </div>
        </div>
      ),
    },
    {
      id: "children",
      name: "자녀",
      icon: (
        <div className="w-20 h-20 flex items-center justify-center">
          <div className="relative">
            <div className="w-6 h-6 bg-blue-400 rounded-full absolute top-0 left-0"></div>
            <div className="w-6 h-6 bg-blue-300 rounded-full absolute top-0 right-0"></div>
            <div className="w-6 h-6 bg-red-400 rounded-full absolute bottom-0 left-2"></div>
            <div className="w-6 h-6 bg-red-300 rounded-full absolute bottom-0 right-2"></div>
          </div>
        </div>
      ),
    },
    {
      id: "cooking",
      name: "요리",
      icon: (
        <div className="w-20 h-20 flex items-center justify-center">
          <div className="relative">
            <div className="w-16 h-10 bg-gray-300 rounded-full"></div>
            <div className="absolute top-2 left-2 w-12 h-6 bg-green-400 rounded-full"></div>
            <div className="absolute top-1 left-6 w-3 h-3 bg-red-500 rounded-full"></div>
            <div className="absolute top-3 right-2 w-2 h-2 bg-yellow-400 rounded-full"></div>
            <div className="absolute -right-2 top-4 w-8 h-2 bg-gray-600 rounded"></div>
          </div>
        </div>
      ),
    },
    {
      id: "memories",
      name: "추억",
      icon: (
        <div className="w-20 h-20 flex items-center justify-center">
          <div className="relative">
            <div className="w-14 h-10 bg-gray-600 rounded-lg"></div>
            <div className="absolute top-1 left-1 w-12 h-8 bg-gray-300 rounded"></div>
            <div className="absolute top-3 left-3 w-8 h-4 bg-gray-700 rounded"></div>
            <div className="absolute -top-1 right-2 w-3 h-3 bg-yellow-400 rounded-full"></div>
            <div className="absolute -right-2 top-2 w-6 h-4 bg-gray-800 rounded"></div>
          </div>
        </div>
      ),
    },
    {
      id: "music",
      name: "음악",
      icon: (
        <div className="w-20 h-20 flex items-center justify-center">
          <div className="relative">
            <div className="w-12 h-16 bg-orange-400 rounded-full"></div>
            <div className="absolute top-2 left-2 w-8 h-12 bg-orange-300 rounded-full"></div>
            <div className="absolute top-0 right-1 w-2 h-8 bg-amber-800 rounded"></div>
            <div className="absolute -bottom-2 -right-1 w-4 h-3 bg-gray-800 rounded"></div>
            <div className="absolute -bottom-2 right-2 w-3 h-2 bg-gray-800 rounded"></div>
          </div>
        </div>
      ),
    },
    {
      id: "travel",
      name: "여행",
      icon: (
        <div className="w-20 h-20 flex items-center justify-center">
          <div className="relative">
            <div className="w-16 h-12 bg-blue-400 rounded-lg transform rotate-45 origin-center"></div>
            <div className="absolute top-4 left-4 w-8 h-4 bg-blue-300 rounded transform rotate-45"></div>
            <div className="absolute top-6 left-6 w-4 h-2 bg-blue-200 rounded transform rotate-45"></div>
          </div>
        </div>
      ),
    },
  ];

  const handleStartCall = () => {
    console.log("Starting call with category:", selectedCategory);
  };

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
  };

  const handleLogout = () => {
    onLogout();
  };

  return (
    <div className="min-h-screen bg-grey-50 flex flex-col">
      {/* Status Bar */}
      <div className="w-full flex justify-between items-center px-6 py-3 h-11 md:hidden">
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
          <svg
            width="15"
            height="11"
            viewBox="0 0 15 11"
            fill="none"
            className="ml-2"
          >
            <path
              d="M7.5 3.5C10.5 3.5 13 5.5 13 8H12C12 6.5 9.5 5 7.5 5S3 6.5 3 8H2C2 5.5 4.5 3.5 7.5 3.5Z"
              fill="black"
            />
          </svg>
          {/* Battery */}
          <div className="ml-2 w-6 h-3 border border-black rounded-sm relative">
            <div className="absolute inset-0.5 bg-black rounded-sm"></div>
            <div className="absolute -right-1 top-1 w-0.5 h-1 bg-black rounded-r"></div>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 md:px-8">
        {/* Logo */}
        <div className="flex items-center">
          <svg width="90" height="28" viewBox="0 0 90 28" fill="none">
            <path
              d="M67.8945 7.44597V4.56752H79.6163V7.44597H75.5525V9.61661C75.5525 10.6076 75.4585 11.4805 75.2706 12.2827C76.3276 13.722 78.7472 15.9634 80.4855 16.8835L79.123 19.8328C77.5726 19.0306 75.4115 17.1431 74.0726 15.2792C73.7907 15.751 73.4853 16.1993 73.1564 16.6712C72.2638 17.9453 70.2671 19.8328 68.9281 20.517L67.0019 17.8037C67.7771 17.4026 69.116 16.3409 70.0557 15.2792C71.5591 13.604 72.1228 12.0232 72.1228 9.73458V7.44597H67.8945ZM81.8244 3.55298H85.2306V10.7963H88.3548V14.0287H85.2306V23.8201H81.8244V3.55298Z"
              fill="black"
            />
            <path
              d="M51.7229 10.5604C55.0586 10.5604 57.4781 12.6838 57.4781 15.869C57.4781 19.0542 55.0586 21.154 51.7229 21.154C48.3638 21.154 45.9912 19.0778 45.9912 15.869C45.9912 12.6838 48.3638 10.5604 51.7229 10.5604ZM59.7332 23.8201V3.55296H63.1393V10.985H66.2636V14.2174H63.1393V23.8201H59.7332ZM45.0751 6.4786H50.1255L49.7732 3.48218H53.8371L53.4847 6.4786H58.3472V9.33347H45.0751V6.4786ZM51.7229 13.2029C50.1725 13.2029 49.1155 14.1938 49.1155 15.869C49.1155 17.5677 50.1725 18.5115 51.7229 18.5115C53.2733 18.5115 54.3304 17.5441 54.3304 15.869C54.3304 14.1938 53.2733 13.2029 51.7229 13.2029Z"
              fill="black"
            />
            <path
              d="M23.1718 14.4297H35.9507C36.2091 13.368 36.4675 11.6928 36.6319 10.0176C36.7259 9.05028 36.7729 7.87058 36.7963 6.78526H25.5679V3.85962H40.3434C40.3669 6.10104 40.2964 7.89418 40.1085 9.7581C39.8971 11.504 39.4743 13.3444 39.1219 14.4297H43.0683V17.3553H34.8936V24.693H31.2526V17.3553H23.1718V14.4297Z"
              fill="black"
            />
            <path
              d="M6.13102 2.93945H10.1009L9.84253 5.36963H13.8594V8.22449H9.81904V8.76715C9.81904 9.3334 9.72508 9.87606 9.56065 10.3951C10.9936 11.4569 13.1077 12.4714 14.3292 12.8253L13.5071 15.7745C11.9802 15.4206 9.70159 14.123 8.19819 12.7781C7.91631 13.132 7.58744 13.4623 7.25857 13.7927C6.01357 14.9959 4.18131 16.0813 2.67791 16.5059L1.57385 13.5331C2.46649 13.2028 3.82895 12.5658 4.74508 11.8108C5.91961 10.8434 6.41291 9.94684 6.41291 8.76715V8.22449H2.16112V5.36963H6.36593L6.13102 2.93945ZM8.40961 17.1194V21.4843H19.92V24.4807H4.95649V17.1194H8.40961ZM16.232 3.5529H19.6381V18.2519H16.232V3.5529Z"
              fill="black"
            />
          </svg>
        </div>

        {/* Right side buttons */}
        <div className="flex items-center gap-2">
          <button className="px-3 py-1 border-2 border-orange-accent text-orange-accent font-crimson text-sm font-bold rounded">
            통화 기록
          </button>
          <button onClick={handleLogout} className="p-2" title="로그아웃">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <path
                d="M18.963 16.0001C18.963 17.6365 17.6364 18.963 16 18.963C14.3636 18.963 13.037 17.6365 13.037 16.0001C13.037 14.3637 14.3636 13.0371 16 13.0371C17.6364 13.0371 18.963 14.3637 18.963 16.0001Z"
                stroke="#EA8C4B"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M13.3333 5.33342C13.3333 3.86066 14.5272 2.66675 16 2.66675C17.4727 2.66675 18.6667 3.86066 18.6667 5.33341C18.6667 5.53121 18.8008 5.70302 18.9907 5.75838C19.7395 5.97666 20.4542 6.27483 21.125 6.64304C21.299 6.73851 21.516 6.71182 21.6563 6.57153C22.6977 5.53013 24.3866 5.5306 25.428 6.572C26.4694 7.6134 26.4699 9.30231 25.4285 10.3437C25.2882 10.484 25.2615 10.701 25.357 10.8749C25.7252 11.5458 26.0234 12.2605 26.2417 13.0093C26.297 13.1992 26.4689 13.3334 26.6667 13.3334C28.1394 13.3334 29.3333 14.5273 29.3333 16.0001C29.3333 17.4728 28.1394 18.6667 26.6667 18.6667C26.4689 18.6667 26.297 18.8009 26.2417 18.9908C26.0243 19.7365 25.7277 20.4483 25.3616 21.1167C25.2658 21.2918 25.2927 21.51 25.4338 21.6512C26.4752 22.6926 26.4693 24.3869 25.4279 25.4283C24.3865 26.4697 22.6922 26.4756 21.6508 25.4342C21.5096 25.293 21.2913 25.2661 21.1162 25.362C20.4479 25.7279 19.7362 26.0245 18.9907 26.2418C18.8008 26.2971 18.6667 26.469 18.6667 26.6667C18.6667 28.1395 17.4727 29.3334 16 29.3334C14.5272 29.3334 13.3333 28.1395 13.3333 26.6667C13.3333 26.469 13.1991 26.2971 13.0093 26.2418C12.2605 26.0235 11.5458 25.7253 10.8749 25.3571C10.701 25.2616 10.4839 25.2883 10.3436 25.4287C9.30216 26.47 7.61324 26.4696 6.57185 25.4282C5.53045 24.3868 5.52997 22.6979 6.57137 21.6565C6.71171 21.5161 6.7384 21.299 6.64291 21.1251C6.27472 20.4543 5.97656 19.7396 5.75829 18.9908C5.70293 18.8009 5.53112 18.6667 5.33332 18.6667C3.86056 18.6667 2.66666 17.4728 2.66666 16.0001C2.66666 14.5273 3.86056 13.3334 5.33332 13.3334C5.53112 13.3334 5.70293 13.1992 5.75829 13.0093C5.97561 12.2639 6.2721 11.5522 6.63807 10.8839C6.73398 10.7088 6.70705 10.4904 6.56585 10.3492C5.52445 9.30782 5.53033 7.6135 6.57173 6.5721C7.61313 5.5307 9.30745 5.52482 10.3488 6.56622C10.49 6.70737 10.7083 6.73429 10.8834 6.6384C11.5518 6.27233 12.2636 5.97575 13.0093 5.75838C13.1991 5.70302 13.3333 5.53121 13.3333 5.33342Z"
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
      <div className="px-5 md:px-8 mb-6">
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
              className="flex items-center gap-1 px-3 py-1 bg-white border border-grey-100 rounded"
            >
              <span className="text-orange-accent font-crimson text-lg font-semibold">
                따뜻한 햇살
              </span>
              <svg
                width="16"
                height="16"
                viewBox="0 0 20 20"
                fill="none"
                className="transform rotate-180"
              >
                <path
                  d="M15 7.5L10 12.5L5 7.5"
                  stroke="#EA8C4B"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
          <span className="text-grey-900 font-crimson text-lg font-bold">
            님
          </span>
        </div>
      </div>

      {/* Description */}
      <div className="px-5 md:px-8 mb-8">
        <h2 className="text-grey-900 font-crimson text-lg md:text-xl font-bold">
          관심사를 선택해 통화를 시작해보세요!
        </h2>
      </div>

      {/* Categories Grid */}
      <div className="flex-1 px-5 md:px-8">
        <div className="grid grid-cols-2 gap-4 md:gap-6 mb-8">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => handleCategorySelect(category.id)}
              className={`relative h-28 md:h-32 bg-white border border-grey-100 rounded-2xl flex flex-col items-center justify-center transition-colors hover:shadow-md ${
                selectedCategory === category.id
                  ? "border-orange-accent bg-orange-accent/5"
                  : ""
              }`}
            >
              <div className="mb-2">{category.icon}</div>
              <span className="text-grey-900 font-crimson text-lg md:text-xl font-bold">
                {category.name}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Subscription Section */}
      <div className="px-5 md:px-8 mb-4">
        <div className="relative bg-orange-subscription rounded-2xl p-6 md:p-8 flex items-center justify-between">
          <div>
            <p className="text-white font-crimson text-base md:text-lg font-bold leading-6">
              구독을 통해
              <br />
              무제한 통화를 시작해보세요
            </p>
          </div>
          <div className="text-4xl md:text-5xl">🔗</div>
        </div>
      </div>

      {/* Start Call Button */}
      <div className="px-5 md:px-8 pb-8 md:pb-12">
        <div className="h-20 md:h-24 relative">
          <button
            onClick={handleStartCall}
            disabled={!selectedCategory}
            className={`w-full h-14 md:h-16 rounded-lg font-crimson text-xl md:text-2xl font-semibold text-white transition-opacity ${
              selectedCategory
                ? "bg-gradient-to-r from-yellow-300 to-red-gradient"
                : "bg-gray-400 opacity-50 cursor-not-allowed"
            }`}
          >
            통화시작
          </button>
        </div>
      </div>
    </div>
  );
}
