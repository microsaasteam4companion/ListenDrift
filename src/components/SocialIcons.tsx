
import { Instagram, Linkedin } from "lucide-react";
import { cn } from "@/lib/utils";

// Official Discord Logo Path (Clyde)
// Adapted for Outline Style: fill=none, stroke=currentColor
const DiscordIcon = ({ className }: { className?: string }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24" // Standard 24x24 grid
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        {/* 
       This path is the specific Discord "Clyde" silhouette including the eyes. 
       By applying stroke instead of fill, we get the correct brand-compliant outline.
    */}
        <path d="M20.317 4.3698a19.7913 19.7913 0 0 0-4.8851-1.5152.0741.0741 0 0 0-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 0 0-.0785-.037 19.7363 19.7363 0 0 0-4.8852 1.515.0699.0699 0 0 0-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 0 0 .0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 0 0 .0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 0 0-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 0 1-.0076-.1277c.1258-.0943.2517-.1892.3718-.2914a.0743.0743 0 0 1 .0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 0 1 .0785.0095c.1202.1023.246.1981.3728.2924a.077.077 0 0 1-.0066.1276 12.2986 12.2986 0 0 1-1.873.8914.0766.0766 0 0 0-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 0 0 .0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 0 0 .0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 0 0-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.419-2.1569 2.419zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.419-2.1568 2.419z" />
    </svg>
);

const SubstackIcon = ({ className }: { className?: string }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        <path d="M4 11.5L12 16L20 11.5" />
        <path d="M4 18.5L12 23L20 18.5" />
        <rect x="4" y="2" width="16" height="5" rx="1" />
    </svg>
);

const LinktreeIcon = ({ className }: { className?: string }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        <path d="M12 2v20" />
        <path d="M8 12h8" />
        <path d="M5 16h14" />
        <path d="M8 8l4-4 4 4" />
    </svg>
);

const SOCIAL_LINKS = [
    {
        name: "Instagram",
        url: "https://www.instagram.com/entrext.labs",
        icon: Instagram,
    },
    {
        name: "Discord",
        url: "https://discord.com/invite/ZZx3cBrx2",
        icon: DiscordIcon,
    },
    {
        name: "LinkedIn",
        url: "https://www.linkedin.com/company/entrext/",
        icon: Linkedin,
    },
    {
        name: "Substack",
        url: "https://entrextlabs.substack.com/subscribe",
        icon: SubstackIcon,
    },
    {
        name: "Linktree",
        url: "https://linktr.ee/entrext.pro",
        icon: LinktreeIcon,
    },
];

interface SocialIconsProps {
    className?: string;
    iconClassName?: string;
}

export const SocialIcons = ({ className, iconClassName }: SocialIconsProps) => {
    return (
        <div className={cn("flex flex-wrap items-center justify-center gap-6", className)}>
            {SOCIAL_LINKS.map((social) => (
                <a
                    key={social.name}
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground transition-all duration-200 hover:scale-110"
                    aria-label={social.name}
                >
                    <social.icon className={cn("w-6 h-6", iconClassName)} />
                </a>
            ))}
        </div>
    );
};
