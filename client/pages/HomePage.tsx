import { useState, useEffect } from "react";
import { getUserProfile } from "@/lib/auth";

interface HomePageProps {
  onStartCall: (category: string) => void;
  onOpenSettings: () => void;
}

export default function HomePage({
  onStartCall,
  onOpenSettings,
}: HomePageProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [userNickname, setUserNickname] = useState<string>("따뜻한 햇살"); // 기본값
  const [isLoadingProfile, setIsLoadingProfile] = useState<boolean>(true);

  // 사용자 프로필 정보 가져오기
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        setIsLoadingProfile(true);
        const profile = await getUserProfile();
        setUserNickname(profile.data.nickname);
      } catch (error) {
        console.error("사용자 프로필 가져오기 실패:", error);
        // 에러가 발생해도 기본 닉네임 유지
      } finally {
        setIsLoadingProfile(false);
      }
    };

    fetchUserProfile();
  }, []);

  const categories = [
    {
      id: "hobby",
      name: "취미",
      icon: (
        <div className="w-20 h-20 flex items-center justify-center">
          <img src="/icons/hobby.png" alt="취미" className="w-16 h-16" />
        </div>
      ),
    },
    {
      id: "children",
      name: "자녀",
      icon: (
        <div className="w-20 h-20 flex items-center justify-center">
          <img src="/icons/children.png" alt="자녀" className="w-16 h-16" />
        </div>
      ),
    },
    {
      id: "cooking",
      name: "요리",
      icon: (
        <div className="w-20 h-20 flex items-center justify-center">
          <img src="/icons/cooking.png" alt="요리" className="w-16 h-16" />
        </div>
      ),
    },
    {
      id: "memories",
      name: "추억",
      icon: (
        <div className="w-20 h-20 flex items-center justify-center">
          <img src="/icons/memories.png" alt="추억" className="w-16 h-16" />
        </div>
      ),
    },
    {
      id: "music",
      name: "음악",
      icon: (
        <div className="w-20 h-20 flex items-center justify-center">
          <img src="/icons/music.png" alt="음악" className="w-16 h-16" />
        </div>
      ),
    },
    {
      id: "travel",
      name: "여행",
      icon: (
        <div className="w-20 h-20 flex items-center justify-center">
          <img src="/icons/travel.png" alt="여행" className="w-16 h-16" />
        </div>
      ),
    },
  ];

  const handleStartCall = () => {
    if (selectedCategory) {
      onStartCall(selectedCategory);
    }
  };

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
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
          <button onClick={onOpenSettings} className="p-2" title="설정">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
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
      <div className="px-5 md:px-8 mb-6">
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
              className={`relative h-28 md:h-32 bg-white border border-grey-100 rounded-2xl flex flex-row items-center justify-center px-4 gap-6 transition-colors hover:shadow-md ${
                selectedCategory === category.id
                  ? "border-orange-accent bg-orange-accent/5"
                  : ""
              }`}
            >
              <span className="text-grey-900 font-crimson text-xl md:text-2xl font-bold whitespace-nowrap">
                {category.name}
              </span>
              <div>{category.icon}</div>
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
