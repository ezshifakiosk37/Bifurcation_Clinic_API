'use client'
import Button from '@/app/_components/Button';
import { cn } from '@/app/_utils/cn/cn';
import { ScaleConfig, SCALES_MAP } from '@/app/_utils/scales/scales';
import { useRouter, usePathname } from 'next/navigation';
import React, { use, useEffect, useState } from 'react'

const DynamicAssessmentForm = ({ params, currentUser }: { params: Promise<{ scaleType: string }>, currentUser: string | null }) => {
    const [answers, setAnswers] = useState<{ [key: number]: number }>({});
    const [isUrdu, setIsUrdu] = useState(false);
    const [isSticky, setIsSticky] = useState(false);
    const [heroHeight, setHeroHeight] = useState(0);
    const resolvedParams = use(params);
    const scaleType = resolvedParams.scaleType;
    const router = useRouter();
    const pathname = usePathname();

    const scaleData: ScaleConfig = SCALES_MAP[scaleType];
    console.log(answers)
    console.log(scaleType)

    // Scroll detection with hero height
    useEffect(() => {
    const handleScroll = () => {

        const heroElement = document.querySelector<HTMLElement>('.hero-section');

        const heroH = heroElement?.offsetHeight ?? 384;

        setHeroHeight(heroH);

        const scrollY = window.scrollY;
        setIsSticky(scrollY > heroH - 100);
    };
    
    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Initial check
    
    return () => window.removeEventListener('scroll', handleScroll);
}, []);

    useEffect(() => {
        setAnswers({});
    }, [scaleType]);

    if (!scaleData) {
        return (
            <div className="min-h-[calc(100vh-6rem)] flex items-center justify-center bg-primary/5 p-6">
                <div className="text-center bg-white p-10 rounded-[2.5rem] shadow-2xl">
                    <h2 className="text-2xl font-black text-red-500 mb-2 tracking-tight">Scale Not Found</h2>
                    <p className="text-slate-500 font-medium">The assessment type "{scaleType}" is invalid.</p>
                </div>
            </div>
        );
    }

    const currentQuestions = isUrdu ? scaleData.ur.questions : scaleData.en.questions;
    const currentTitle = isUrdu ? scaleData.title : scaleData.title;

    const handleSelect = (index: number, value: number) => {
        setAnswers((prev) => ({ ...prev, [index]: value }));
    };

    const handleSubmit = async () => {
        if (Object.keys(answers).length < currentQuestions.length) {
            alert(isUrdu ? "براہ کرم تمام سوالات کے جوابات دیں۔" : "Please answer all questions before submitting.");
            return;
        }

        const detailedResults = currentQuestions.map((q, index) => {
            const selectedValue = answers[index];
            const selectedOption = q.options.find(opt => opt.value === selectedValue);

            return {
                questionNumber: index + 1,
                questionText: q.question,
                selectedLabel: selectedOption ? selectedOption.Label : "N/A",
                score: selectedValue
            };
        });

        const totalScore = Object.values(answers).reduce((sum, v) => sum + v, 0);

        try {
            const isResearch = pathname.includes('assessment/epds') && currentUser === "Admin";
            const storageKey = isResearch ? "researchDemographicData" : "normalDemographicData";
            const apiEndpoint = isResearch ? "/api/save-research-result" : "/api/save-result";

            const demographicStr = localStorage.getItem(storageKey);

            if (!demographicStr) {
                alert("Demographic session expired. Please restart the assessment.");
                return;
            }

            const { entryId, user_id } = JSON.parse(demographicStr);

            if (!user_id) {
                alert("You must be logged in to save results.");
                router.push('/sign-in');
                return;
            }

            const res = await fetch(apiEndpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    entryId,
                    questionnaireType: scaleData.title,
                    totalScore,
                    detailedResults,
                    user_id,
                }),
            });

            if (res.ok) {
                localStorage.setItem("entryId", entryId.toString());
                router.push("/result");
            } else {
                const errorData = await res.json();
                alert(errorData.error || "Failed to save results.");
            }

        } catch (err) {
            console.error(err);
            alert("Connection error — please check your internet and try again.");
        }
    };

    const progress = Math.round((Object.keys(answers).length / currentQuestions.length) * 100);

    return (
        <div className="min-h-[calc(100vh-6rem)] bg-primary/5 pb-20 overflow-x-hidden">
            {/* Hero Section */}
            <div
                id="hero-section"
                className="w-full h-50 sm:h-96 relative overflow-hidden hero-section"
                style={{ background: `linear-gradient(135deg, #0094cf 0%, #9c2790 100%)` }}
            >
                <div className="absolute inset-0 opacity-10 pointer-events-none">
                    <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                        <path d="M0 100 C 20 0 50 0 100 100 Z" fill="white" />
                    </svg>
                </div>

                <div className="relative z-10 flex flex-col items-center justify-center h-full px-3 sm:px-6 text-center pt-4 sm:pt-8">
                    <div className="bg-white/20 backdrop-blur-md px-4 py-1 sm:py-1.5 rounded-full text-white text-[12px] sm:text-[12px] font-black uppercase tracking-[0.3em] mb-2 sm:mb-4 border border-white/30">
                        {isUrdu ? "جائزہ کا عمل" : "Assessment in Progress"}
                    </div>
                    <h1 className={cn(
                        "text-[28px] sm:text-4xl md:text-5xl font-black text-white tracking-tight drop-shadow-sm",
                        isUrdu && "urdu-text"
                    )}>
                        {currentTitle}
                    </h1>

                    <button
                        type="button"
                        onClick={() => setIsUrdu((prev) => !prev)}
                        className="mt-2 sm:mt-6 px-6 py-2 rounded-full bg-white text-secondary hover:bg-slate-50 transition-all font-bold text-sm shadow-lg flex items-center gap-2"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>
                        {isUrdu ? "Switch to English" : "اردو میں دیکھیں"}
                    </button>
                </div>
            </div>

            {/* PROGRESS BAR - */}
            <div className="relative w-full">
                {/* Placeholder to maintain space when bar becomes fixed */}
                <div 
                    className="w-full max-w-3xl mx-auto px-4 sm:px-6"
                    style={{ height: isSticky ? 'auto' : 'auto' }}
                >
                    {/* Actual Progress Bar */}
                    <div 
                        className={`transition-all duration-300 ${
                            isSticky 
                                ? 'fixed top-0 z-50 w-full left-0 right-0' 
                                : 'relative z-30'
                        }`}
                    >
                        <div className="bg-white/90 backdrop-blur-md rounded-2xl sm:rounded-3xl shadow-xl shadow-blue-900/10 border border-white/50 p-3 sm:p-4 px-4 sm:px-6">
                            <div className="flex justify-between items-center mb-3">
                                <span className="text-primary font-black text-[12px] sm:text-[14px] md:text-[16px] uppercase tracking-wider">
                                    {isUrdu ? "باقی سوالات:" : "QUESTIONS LEFT"}{" "}
                                    <span className="text-secondary text-[16px] ml-1">
                                        {currentQuestions.length - Object.keys(answers).length}
                                    </span>
                                </span>

                                <span className="text-primary font-bold text-[11px] sm:text-[13px] md:text-[15px] uppercase tracking-wide">
                                    <span className="text-secondary text-[16px] mr-1">
                                        {progress}%
                                    </span>
                                    {isUrdu ? "مکمل" : "COMPLETED"}
                                </span>
                            </div>

                            <div className="w-full bg-slate-100 rounded-full h-2 sm:h-2.5 overflow-hidden">
                                <div
                                    className="bg-linear-to-r from-primary to-secondary h-full rounded-full transition-all duration-700 ease-out"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Card  */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-8">
                <div className="bg-white rounded-3xl sm:rounded-[2.5rem] shadow-xl sm:shadow-2xl shadow-blue-900/5 border border-slate-100 p-5 sm:p-8 md:p-12">
                    <div className="space-y-10 sm:space-y-14 md:space-y-16">
                        {currentQuestions.map((q, i) => (
                            <div key={i} className="space-y-6">
                                <div className={cn("flex items-start gap-4", isUrdu && "flex-row-reverse")}>
                                    <span className="w-1.5 h-8 bg-secondary rounded-full mt-1 shrink-0"></span>
                                    <p className={cn(
                                        "text-[16px] sm:text-[18px] md:text-[22px] font-bold text-primary",
                                        isUrdu && "text-right urdu-text"
                                    )}>
                                        {i + 1}. {q.question}
                                    </p>
                                </div>

                                <div className={cn("flex flex-col gap-2")}>
                                    {q.options.map((opt, idx) => {
                                        const isSelected = answers[i] === opt.value;
                                        return (
                                            <button
                                                key={idx}
                                                onClick={() => handleSelect(i, opt.value)}
                                                className={cn(
                                                    "flex items-center gap-3 px-6 py-4 rounded-2xl border-2 transition-all duration-300 cursor-pointer text-left",
                                                    isSelected
                                                        ? "bg-[rgba(156,39,144,0.05)] border-secondary text-secondary shadow-sm shadow-secondary/10"
                                                        : "bg-slate-50 border-transparent text-slate-500 hover:border-slate-200 hover:bg-slate-100",
                                                    isUrdu && "flex-row-reverse text-right"
                                                )}
                                            >
                                                <div className={cn(
                                                    "h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors",
                                                    isSelected ? "border-secondary" : "border-slate-300"
                                                )}>
                                                    {isSelected && <div className="h-2.5 w-2.5 rounded-full bg-secondary" />}
                                                </div>
                                                <span className={cn(
                                                    "font-bold text-[14px] sm:text-[16px] md:text-[18px] leading-tight",
                                                    isUrdu && "urdu-text text-[18px]"
                                                )}>
                                                    {opt.Label}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}

                        <div className="pt-8 border-t border-slate-100">
                            <Button type="button" onClick={handleSubmit}>
                                <span className={cn(
                                    "flex items-center justify-center gap-3",
                                    isUrdu && "flex-row-reverse urdu-text text-xl"
                                )}>
                                    {isUrdu ? "فارم جمع کریں" : "SUBMIT ASSESSMENT"}
                                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={cn(isUrdu ? "rotate-180" : "")}>
                                        <path d="M5 12h14m-7-7 7 7-7 7" />
                                    </svg>
                                </span>
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default DynamicAssessmentForm;