import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";

/** The system's Reduce Motion setting: decorative loops (rain, pulses) hold still when it's on. */
export function useReduceMotion(): boolean {
    const [reduce, setReduce] = useState(false);
    useEffect(() => {
        let live = true;
        void AccessibilityInfo.isReduceMotionEnabled().then((on) => {
            if (live) setReduce(on);
        });
        const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduce);
        return () => {
            live = false;
            subscription.remove();
        };
    }, []);
    return reduce;
}
