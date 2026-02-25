import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertCircle, Loader2, Building2, KeyRound } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function BackOfficeLogin() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showResetDialog, setShowResetDialog] = useState(false);
    const [resetUsername, setResetUsername] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [isResetting, setIsResetting] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const response = await base44.functions.invoke('manageBackOfficeAuth', {
                action: 'verify',
                username,
                password
            });

            if (response.data.success) {
                sessionStorage.setItem('backOfficeAuthenticated', 'true');
                navigate(createPageUrl('backoffice'));
            } else {
                setError(response.data.error || 'Invalid credentials.');
            }
        } catch (err) {
            setError(err.response?.data?.error || 'An unknown error occurred. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        setIsResetting(true);

        try {
            const response = await base44.functions.invoke('manageBackOfficeAuth', {
                action: 'reset_password',
                username: resetUsername,
                password: newPassword
            });

            if (response.data.success) {
                toast.success('Password reset successfully!');
                setShowResetDialog(false);
                setResetUsername('');
                setNewPassword('');
            } else {
                toast.error(response.data.error || 'Failed to reset password');
            }
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to reset password. Make sure you have Super Admin access.');
        } finally {
            setIsResetting(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
            <Card className="w-full max-w-sm shadow-xl">
                <CardHeader className="text-center">
                    <Building2 className="mx-auto h-12 w-12 text-gray-400" />
                    <CardTitle className="mt-4">Back Office Access</CardTitle>
                    <CardDescription>Please enter your credentials to continue.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="username">Username</Label>
                            <Input
                                id="username"
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                                placeholder="Enter your username"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                placeholder="Enter your password"
                            />
                        </div>

                        {error && (
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Signing In...
                                </>
                            ) : (
                                'Sign In'
                            )}
                        </Button>

                        <Button 
                            type="button" 
                            variant="outline" 
                            className="w-full" 
                            onClick={() => setShowResetDialog(true)}
                        >
                            <KeyRound className="mr-2 h-4 w-4" />
                            Reset Credentials
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {/* Reset Password Dialog */}
            <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Reset Back Office Credentials</DialogTitle>
                        <DialogDescription>
                            Reset the password for a back office user. Requires Super Admin access.
                        </DialogDescription>
                    </DialogHeader>
                    
                    <form onSubmit={handleResetPassword} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="reset-username">Username</Label>
                            <Input
                                id="reset-username"
                                type="text"
                                value={resetUsername}
                                onChange={(e) => setResetUsername(e.target.value)}
                                required
                                placeholder="Enter username to reset"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="new-password">New Password</Label>
                            <Input
                                id="new-password"
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                                placeholder="Enter new password"
                            />
                        </div>

                        <div className="flex gap-3 justify-end">
                            <Button 
                                type="button" 
                                variant="outline" 
                                onClick={() => setShowResetDialog(false)}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isResetting}>
                                {isResetting ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Resetting...
                                    </>
                                ) : (
                                    'Reset Password'
                                )}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}