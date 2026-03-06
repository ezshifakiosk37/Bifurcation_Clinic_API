export const consultForm = [
    {
        question: "Do you have enough privacy to attend a counseling session without interruptions?",
        options: [
            { Label: "Yes" },
            { Label: "No" },
        ],
        optional: true
    },
    {
        question: "If video call is possible, are you comfortable turning your video on during the session?",
        options: [
            { Label: "Yes" },
            { Label: "No, I prefer to keep my video off" },
        ],
        optional: false
    },
    {
        question: "What time of the day is most comfortable for you to attend a counseling session?",
        options: [
            { Label: "Morning" },
            { Label: "Afternoon" },
            { Label: "Evening" },
        ],
        optional: false
    },
    {
        question: "Please mention a specific time slot if possible.",
        options: [
            { Label: "Ask" },
        ],
        optional: true
    },
]