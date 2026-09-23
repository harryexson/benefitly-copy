import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { EnterpriseContract, AssociationAccount } from '@/entities/all';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, FileText } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';

export default function ContractAcceptance() {
    const navigate = useNavigate();
    const location = useLocation();
    const [contract, setContract] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isActivating, setIsActivating] = useState(false);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const contractId = params.get('contract_id');

        if (!contractId) {
            toast.error("Invalid contract link.");
            navigate(createPageUrl('LandingPage'));
            return;
        }

        const fetchContract = async () => {
            try {
                const fetchedContract = await EnterpriseContract.get(contractId);
                const association = await AssociationAccount.get(fetchedContract.association_account_id);
                setContract({ ...fetchedContract, organization_name: association.organization_name });
            } catch (error) {
                toast.error("Could not retrieve contract details.");
                console.error(error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchContract();
    }, [location, navigate]);

    const handleAcceptAndActivate = async () => {
        setIsActivating(true);
        try {
            // Update contract status
            await EnterpriseContract.update(contract.id, {
                status: 'Active',
                signed_at: new Date().toISOString(),
            });

            // Activate the association account
            await AssociationAccount.update(contract.association_account_id, {
                account_status: 'active',
                next_billing_date: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0],
                subscription_tier_id: 'enterprise' // Set tier to enterprise
            });

            toast.success("Contract accepted and account activated!");
            
            // Redirect to dashboard after a delay
            setTimeout(() => {
                // We can't auto-login the user, so we direct them to the sign-in flow
                navigate(createPageUrl('Dashboard'));
            }, 2000);

        } catch (error) {
            toast.error("Activation failed. Please contact support.");
            console.error(error);
            setIsActivating(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
            </div>
        );
    }

    if (!contract) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <p>Contract not found.</p>
            </div>
        );
    }
    
    if (contract.status === 'Active') {
        return (
             <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
                <Card className="w-full max-w-2xl text-center shadow-lg">
                    <CardHeader>
                        <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                        <CardTitle className="text-2xl">Account Already Activated</CardTitle>
                        <CardDescription>
                            This contract has already been signed and the account is active.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button onClick={() => navigate(createPageUrl('Dashboard'))}>Go to Dashboard</Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
            <Card className="w-full max-w-3xl shadow-lg">
                <CardHeader>
                    <CardTitle className="text-2xl">Review and Accept Your Enterprise Agreement</CardTitle>
                    <CardDescription>
                        Your payment was successful. Please review the terms below and click "Accept & Activate" to finalize your subscription.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="p-4 border rounded-lg bg-gray-50 max-h-96 overflow-y-auto">
                        <h3 className="font-semibold mb-2 flex items-center gap-2">
                           <FileText className="h-4 w-4"/> Master Service Agreement
                        </h3>
                        <pre className="text-xs whitespace-pre-wrap font-sans">
                            {contract.msa_document_text.replace('[CUSTOMER ORGANIZATION NAME]', contract.organization_name || 'Your Organization')}
                        </pre>
                    </div>

                    <div className="p-4 border rounded-lg bg-blue-50">
                        <h3 className="font-semibold mb-2">Key Terms Summary</h3>
                        <ul className="space-y-1 text-sm">
                            <li><strong>Subscription Price:</strong> ${contract.custom_monthly_price}/month</li>
                            <li><strong>Member Limit:</strong> {contract.custom_member_limit} members</li>
                            <li><strong>Contract Term:</strong> {contract.contract_term_months} months</li>
                        </ul>
                    </div>

                    <Button onClick={handleAcceptAndActivate} disabled={isActivating} className="w-full" size="lg">
                        {isActivating ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Activating...
                            </>
                        ) : (
                            'Accept & Activate Account'
                        )}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}