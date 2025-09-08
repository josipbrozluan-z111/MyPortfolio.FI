import React from 'react';
import { BookOpenIcon } from './Icons';

const EmptyState: React.FC = () => (
    <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
        <BookOpenIcon className="w-24 h-24 mb-4 text-gray-600"/>
        <h2 className="text-2xl font-semibold text-gray-400">Select an entry</h2>
        <p className="mt-2 max-w-md">
            Choose an entry from the sidebar to continue your work, or create a new one to start fresh.
        </p>
    </div>
);

export default EmptyState;
