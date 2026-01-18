
import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface HeaderProps {
    title: string;
    showBack?: boolean;
}

export default function Header({ title, showBack = true }: HeaderProps) {
    const navigate = useNavigate();
    return (
        <header className="flex items-center p-4 bg-white border-b sticky top-0 z-10" style={{ borderColor: 'var(--color-border)' }}>
            {showBack && (
                <button onClick={() => navigate(-1)} className="mr-4 p-1">
                    <ChevronLeft />
                </button>
            )}
            <h1 className="text-lg font-bold">{title}</h1>
        </header>
    );
}
