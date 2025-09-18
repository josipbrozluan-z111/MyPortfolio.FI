import { PortfolioData, GoogleDriveUser } from '../types';

// Configuration for Google APIs
const CLIENT_ID = '54041417021-c5fe8lov2tfknpcsu4hu17h5kkkh4b7c.apps.googleusercontent.com';
const API_KEY = 'AIzaSyAonnr61_2bC1iYaXBWodX4bSml9j4rnNc';
const SCOPES = 'https://www.googleapis.com/auth/drive.appdata https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile';
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';
const FILE_NAME = 'portfolio-data.json';

// Type declarations for Google APIs loaded from external scripts
declare const gapi: any;
declare const google: any;

// Module-level state
let tokenClient: any | null = null;
let isAuthInitialized = false;
let isDriveApiInitialized = false;

/**
 * PHASE 1: Initializes the Google Identity Services (GIS) client for authentication.
 * This is called on application startup. It's lightweight and only handles the sign-in process.
 */
export function initGoogleAuth(): Promise<void> {
    if (isAuthInitialized) {
        return Promise.resolve();
    }

    return new Promise<void>((resolve, reject) => {
        const gsiScript = document.createElement('script');
        gsiScript.src = 'https://accounts.google.com/gsi/client';
        gsiScript.async = true;
        gsiScript.defer = true;
        gsiScript.onload = () => {
            try {
                tokenClient = google.accounts.oauth2.initTokenClient({
                    client_id: CLIENT_ID,
                    scope: SCOPES,
                    callback: '', // Will be set dynamically in signIn.
                });
                isAuthInitialized = true;
                resolve();
            } catch (err) {
                console.error("Failed to initialize Google Identity Services token client.", err);
                reject(new Error("Failed to initialize Google Identity Services."));
            }
        };
        gsiScript.onerror = () => reject(new Error("Failed to load Google script. Check network or ad blockers."));
        document.head.appendChild(gsiScript);
    });
}

/**
 * PHASE 2: Initializes the Google API (GAPI) client for Drive operations.
 * This is a heavier operation and is only called on-demand when Drive access is explicitly enabled by the user.
 */
export function initGoogleDriveApi(): Promise<void> {
    if (isDriveApiInitialized) {
        return Promise.resolve();
    }

    return new Promise<void>((resolve, reject) => {
        const gapiScript = document.createElement('script');
        gapiScript.src = 'https://apis.google.com/js/api.js';
        gapiScript.async = true;
        gapiScript.defer = true;
        gapiScript.onload = () => {
            gapi.load('client', {
                callback: () => {
                    gapi.client.init({
                        apiKey: API_KEY,
                        discoveryDocs: [DISCOVERY_DOC],
                    }).then(() => {
                        isDriveApiInitialized = true;
                        resolve();
                    }, (error: any) => {
                        console.error("Error during gapi.client.init:", error);
                        const message = error.result?.error?.message || error.details || 'API discovery response missing required fields.';
                        reject(new Error(message));
                    });
                },
                onerror: () => reject(new Error("Failed to load the GAPI client library.")),
                timeout: 10000,
                ontimeout: () => reject(new Error("Timeout while loading GAPI client library."))
            });
        };
        gapiScript.onerror = () => reject(new Error("Failed to load GAPI script (api.js)."));
        document.head.appendChild(gapiScript);
    });
}

/**
 * Prompts the user to sign in and fetches their profile. Decoupled from GAPI initialization.
 */
export function signIn(): Promise<GoogleDriveUser> {
    return new Promise((resolve, reject) => {
        if (!tokenClient) {
            return reject(new Error("Google auth client is not initialized."));
        }

        tokenClient.callback = async (response: any) => {
            if (response.error) {
                return reject(new Error(`Sign-in failed: ${response.error}.`));
            }
            if (!response.access_token) {
                return reject(new Error("Sign-in failed: No access token received."));
            }

            sessionStorage.setItem('gdrive_token', response.access_token);

            try {
                const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                    headers: { 'Authorization': `Bearer ${response.access_token}` }
                });
                if (!userInfoResponse.ok) {
                    throw new Error('Failed to fetch user info from Google.');
                }
                const profile = await userInfoResponse.json();
                resolve({
                    name: profile.name,
                    email: profile.email,
                    picture: profile.picture,
                });
            } catch (err: any) {
                console.error("Failed to fetch user profile:", err);
                reject(new Error(`Could not fetch user profile: ${err.message}`));
            }
        };

        try {
            tokenClient.requestAccessToken({ prompt: '' });
        } catch (error) {
            reject(new Error("Failed to request access token. Popups may be blocked."));
        }
    });
}

/** Signs the user out. */
export function signOut(): void {
    const token = sessionStorage.getItem('gdrive_token');
    if (token && typeof google !== 'undefined' && google.accounts) {
        google.accounts.oauth2.revoke(token, () => {});
    }
    sessionStorage.removeItem('gdrive_token');
    if (typeof gapi !== 'undefined' && gapi.client) {
        gapi.client.setToken(null);
    }
}

/**
 * Checks for a token in sessionStorage and validates it to restore a session.
 * @returns The user object if the session is restored, otherwise null.
 */
export async function restoreSignIn(): Promise<GoogleDriveUser | null> {
    const token = sessionStorage.getItem('gdrive_token');
    if (!token) {
        return null;
    }

    try {
        const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!userInfoResponse.ok) {
            // Token is likely expired or invalid
            throw new Error('Invalid token');
        }

        const profile = await userInfoResponse.json();
        return {
            name: profile.name,
            email: profile.email,
            picture: profile.picture,
        };
    } catch (err) {
        console.warn("Failed to restore sign-in with existing token:", err);
        signOut(); // Clean up the bad token
        return null;
    }
}


/** Helper to ensure GAPI is loaded and has the auth token set before making a Drive request. */
async function ensureDriveApiReady(): Promise<void> {
    if (!isDriveApiInitialized) {
        throw new Error("Google Drive is not initialized. Please enable Drive sync first.");
    }
    const token = sessionStorage.getItem('gdrive_token');
    if (!token) {
        throw new Error("User is not signed in or the session has expired.");
    }
    gapi.client.setToken({ access_token: token });
}

/** Finds the portfolio file in the 'appDataFolder' to get its ID. */
async function findPortfolioFileId(): Promise<string | null> {
    await ensureDriveApiReady();
    try {
        const response = await gapi.client.drive.files.list({
            spaces: 'appDataFolder',
            fields: 'files(id, name)',
            q: `name='${FILE_NAME}'`,
        });
        const file = response.result.files?.[0];
        return file?.id || null;
    } catch (err: any) {
        console.error("Error finding portfolio file:", err);
        throw new Error(`Could not search for file: ${err.result?.error?.message || err.message}`);
    }
}

/** Saves the portfolio data to Google Drive. */
export async function savePortfolioToDrive(portfolioData: PortfolioData): Promise<void> {
    await ensureDriveApiReady();
    const fileId = await findPortfolioFileId();
    const content = JSON.stringify(portfolioData);

    const boundary = '-------314159265358979323846';
    const delimiter = `\r\n--${boundary}\r\n`;
    const close_delim = `\r\n--${boundary}--`;
    const metadata = fileId ? {} : { name: FILE_NAME, mimeType: 'application/json', parents: ['appDataFolder'] };

    const multipartRequestBody =
        delimiter + 'Content-Type: application/json; charset=UTF-8\r\n\r\n' + JSON.stringify(metadata) +
        delimiter + 'Content-Type: application/json\r\n\r\n' + content + close_delim;

    const path = `/upload/drive/v3/files${fileId ? `/${fileId}` : ''}?uploadType=multipart`;
    const method = fileId ? 'PATCH' : 'POST';

    try {
        await gapi.client.request({
            'path': path, 'method': method,
            'headers': { 'Content-Type': `multipart/related; boundary="${boundary}"` },
            'body': multipartRequestBody
        });
    } catch (err: any) {
        console.error("Error saving to Drive:", err);
        throw new Error(`Save failed: ${err.result?.error?.message || err.message}`);
    }
}

/** Loads the portfolio data from the file in Google Drive. */
export async function loadPortfolioFromDrive(): Promise<PortfolioData | null> {
    await ensureDriveApiReady();
    const fileId = await findPortfolioFileId();
    if (!fileId) {
        return null;
    }

    try {
        const response = await gapi.client.drive.files.get({ fileId, alt: 'media' });
        return typeof response.body === 'string' ? JSON.parse(response.body) : response.body;
    } catch (err: any) {
        console.error("Error loading from Drive:", err);
        throw new Error(`Load failed: ${err.result?.error?.message || err.message}`);
    }
}
