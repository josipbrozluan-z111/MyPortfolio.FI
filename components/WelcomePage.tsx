import React from 'react';
import { BookOpenIcon, PlusIcon, UploadIcon } from './Icons';

interface WelcomePageProps {
  onCreateProject: () => void;
  onTriggerUpload: () => void;
}

const WelcomePage: React.FC<WelcomePageProps> = ({ onCreateProject, onTriggerUpload }) => (
  <div className="flex items-center justify-center h-screen w-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-100 font-sans">
    <div className="flex flex-col items-center justify-center text-center p-8">
        <BookOpenIcon className="w-24 h-24 mb-6 text-gray-400 dark:text-gray-600"/>
        <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-200">Welcome to Portfolio Writer</h2>
        <p className="mt-2 max-w-lg text-gray-500 dark:text-gray-400">
          Your personal space to craft, manage, and showcase your writing. Get started by creating your first piece or importing an existing project.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-4">
          <button 
            onClick={onCreateProject} 
            className="flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-white accent-bg accent-bg-hover rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 dark:focus:ring-offset-gray-900 ring-accent transition-all"
          >
            <PlusIcon className="w-5 h-5" />
            Create New Project
          </button>
          <button 
            onClick={onTriggerUpload}
            className="flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-gray-800 dark:text-white bg-gray-300/70 dark:bg-gray-700 rounded-md hover:bg-gray-400/50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 dark:focus:ring-offset-gray-900 ring-accent transition-colors"
          >
            <UploadIcon className="w-5 h-5" />
            Import from File
          </button>
        </div>
      </div>
  </div>
);

export default WelcomePage;