"use client";

import { useState, useRef, useEffect } from "react";
import { X, UploadCloud, FileText, CheckCircle2, AlertCircle, Loader2, ArrowRight, ShieldCheck, Briefcase } from "lucide-react";
import PhoneInputWithCountry from "./PhoneInputWithCountry";

interface ApplyModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: {
    id?: string;
    title: string;
    slug?: string;
    department?: string;
    location?: string;
    compensation?: string;
  };
}

export default function ApplyModal({ isOpen, onClose, job }: ApplyModalProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("+1 ");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [coverNote, setCoverNote] = useState("");

  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeFilename, setResumeFilename] = useState("");
  const [resumeFileData, setResumeFileData] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset form state on open
  useEffect(() => {
    if (isOpen) {
      setIsSuccess(false);
      setErrorMessage("");
    }
  }, [isOpen]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const handleFile = (file: File) => {
    if (!file) return;

    // Validate type (PDF, DOC, DOCX)
    const validTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
    ];
    const isExtValid = /\.(pdf|doc|docx|txt)$/i.test(file.name);

    if (!validTypes.includes(file.type) && !isExtValid) {
      setErrorMessage("Please upload a PDF, DOC, or DOCX document.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage("File size must be less than 10MB.");
      return;
    }

    setErrorMessage("");
    setResumeFile(file);
    setResumeFilename(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setResumeFileData(result || "");
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!firstName.trim()) {
      setErrorMessage("Please enter your first name.");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setErrorMessage("Please enter a valid work or personal email address.");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        job_id: job.id,
        job_slug: job.slug,
        job_title: job.title,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim(),
        phone_number: phone.trim(),
        linkedin_url: linkedinUrl.trim(),
        portfolio_url: portfolioUrl.trim(),
        resume_filename: resumeFilename,
        resume_file_data: resumeFileData,
        cover_note: coverNote.trim(),
      };

      const res = await fetch("/api/applications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to submit application.");
      }

      setIsSuccess(true);
    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Header Ribbon */}
        <div className="bg-gradient-to-r from-[#0d233a] via-[#102a45] to-[#1e3a8a] text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 text-gray-300 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-300 mb-1">
            <Briefcase className="w-3.5 h-3.5" />
            <span>Position Application</span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white pr-8">
            {job.title}
          </h2>
          <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-blue-100/90 font-medium">
            {job.department && <span>{job.department}</span>}
            {job.department && job.location && <span>•</span>}
            {job.location && <span>{job.location}</span>}
            {job.compensation && <span>•</span>}
            {job.compensation && <span className="text-amber-300 font-semibold">{job.compensation}</span>}
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 md:p-8 max-h-[75vh] overflow-y-auto">
          {isSuccess ? (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-200">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Application Received</h3>
              <p className="text-gray-600 text-sm max-w-lg mx-auto leading-relaxed mb-6">
                Thank you for applying to <strong className="text-gray-900">{job.title}</strong>. Our executive search team will review your qualifications and CV.
              </p>

              <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-4 max-w-lg mx-auto text-left mb-6">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-[#0069ff] shrink-0 mt-0.5" />
                  <div className="text-xs text-gray-700 leading-relaxed">
                    <span className="font-semibold text-gray-900 block mb-1">Next Steps & Interview Scheduling:</span>
                    If your profile matches the role profile, you will receive an invitation link directly to <strong className="text-gray-900">{email}</strong> to schedule a private screening interview with our talent leadership.
                  </div>
                </div>
              </div>

              <button
                onClick={onClose}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#0d233a] hover:bg-[#163352] text-white text-sm font-semibold rounded-xl shadow-md transition-all cursor-pointer"
              >
                Close & Return to Positions
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {errorMessage && (
                <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Name Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="e.g. Eleanor"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-[#0069ff] focus:ring-1 focus:ring-[#0069ff]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="e.g. Vance"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-[#0069ff] focus:ring-1 focus:ring-[#0069ff]"
                  />
                </div>
              </div>

              {/* Contact Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="eleanor.vance@example.com"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-[#0069ff] focus:ring-1 focus:ring-[#0069ff]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                    Phone Number
                  </label>
                  <PhoneInputWithCountry
                    value={phone}
                    onChange={setPhone}
                    required={false}
                  />
                </div>
              </div>

              {/* Professional Links */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                    LinkedIn Profile
                  </label>
                  <input
                    type="url"
                    value={linkedinUrl}
                    onChange={(e) => setLinkedinUrl(e.target.value)}
                    placeholder="https://linkedin.com/in/username"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-[#0069ff] focus:ring-1 focus:ring-[#0069ff]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                    Portfolio / Website / GitHub
                  </label>
                  <input
                    type="url"
                    value={portfolioUrl}
                    onChange={(e) => setPortfolioUrl(e.target.value)}
                    placeholder="https://yourportfolio.com"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-[#0069ff] focus:ring-1 focus:ring-[#0069ff]"
                  />
                </div>
              </div>

              {/* Resume / CV Upload Dropzone */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Resume / CV Document (PDF, DOCX)
                </label>
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-5 text-center transition-all cursor-pointer ${
                    isDragging
                      ? "border-[#0069ff] bg-blue-50/50"
                      : resumeFile
                      ? "border-emerald-300 bg-emerald-50/30"
                      : "border-gray-300 hover:border-gray-400 bg-gray-50/50"
                  }`}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFile(e.target.files[0]);
                      }
                    }}
                    accept=".pdf,.doc,.docx,.txt"
                    className="hidden"
                  />

                  {resumeFile ? (
                    <div className="flex items-center justify-center gap-3">
                      <FileText className="w-8 h-8 text-emerald-600 shrink-0" />
                      <div className="text-left">
                        <p className="text-sm font-semibold text-gray-900 truncate max-w-xs md:max-w-sm">
                          {resumeFilename}
                        </p>
                        <p className="text-xs text-gray-500">
                          {(resumeFile.size / 1024).toFixed(1)} KB • Click or drop to replace
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <div className="w-10 h-10 bg-blue-50 text-[#0069ff] rounded-full flex items-center justify-center mx-auto mb-2">
                        <UploadCloud className="w-5 h-5" />
                      </div>
                      <p className="text-sm font-medium text-gray-700">
                        <span className="text-[#0069ff] font-semibold">Click to upload CV</span> or drag and drop
                      </p>
                      <p className="text-xs text-gray-400">PDF, DOCX or DOC (up to 10MB)</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Cover Note */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Brief Introduction or Cover Note (Optional)
                </label>
                <textarea
                  rows={3}
                  value={coverNote}
                  onChange={(e) => setCoverNote(e.target.value)}
                  placeholder="Share a brief overview of your background, leadership experience, or target compensation expectations..."
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-[#0069ff] focus:ring-1 focus:ring-[#0069ff] resize-none"
                />
              </div>

              {/* Privacy / Security Notice */}
              <div className="flex items-center gap-2 text-[11px] text-gray-500 bg-gray-50 p-2.5 rounded-lg">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Your application and resume are held strictly confidential and protected under our non-disclosure policy.</span>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#0069ff] hover:bg-[#0055d4] text-white text-sm font-semibold shadow-md hover:shadow-lg transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Submitting Profile...</span>
                    </>
                  ) : (
                    <>
                      <span>Submit Application</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
