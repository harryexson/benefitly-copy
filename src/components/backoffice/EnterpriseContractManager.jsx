import React, { useState, useEffect } from 'react';
import { LegalDocumentTemplate } from '@/entities/all';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';

export default function EnterpriseContractManager({ account, onCancel }) {
    const [customPrice, setCustomPrice] = useState(199);
    const [customMemberLimit, setCustomMemberLimit] = useState(1500);
    const [contractTerm, setContractTerm] = useState(12);
    const [msaTemplate, setMsaTemplate] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedLink, setGeneratedLink] = useState('');
    const [isCopied, setIsCopied] = useState(false);

    useEffect(() => {
        const fetchTemplate = async () => {
            try {
                const templates = await LegalDocumentTemplate.filter({ is_active: true });
                if (templates.length > 0) {
                    setMsaTemplate(templates[0].template_text);
                } else {
                    toast.error("No active MSA template found.");
                }
            } catch (error) {
                toast.error("Failed to load MSA template.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchTemplate();
    }, []);

    const handleGenerateLink = async () => {
        setIsGenerating(true);
        setGeneratedLink('');
        try {
            const msaTextWithValues = msaTemplate
                .replace('[CUSTOMER ORGANIZATION NAME]', account.organization_name)
                .replace('[CONTRACT TERM MONTHS]', contractTerm)
                .replace('$[CUSTOM MONTHLY PRICE]', `$${customPrice}`)
                .replace('[CUSTOM MEMBER LIMIT]', customMemberLimit);

            const response = await base44.functions.invoke('generateEnterpriseCheckout', {
                associationAccountId: account.id,
                customPrice: parseFloat(customPrice),
                customMemberLimit: parseInt(customMemberLimit),
                contractTerm: parseInt(contractTerm),
                msaText: msaTextWithValues,
            });

            if (response.data.checkoutUrl) {
                setGeneratedLink(response.data.checkoutUrl);
                toast.success("Checkout link generated successfully!");
            } else {
                throw new Error("No checkout URL returned from server.");
            }
        } catch (error) {
            toast.error(`Failed to generate link: ${error.message}`);
            console.error(error);
        } finally {
            setIsGenerating(false);
        }
    };
    
    const handleCopy = () => {
        navigator.clipboard.writeText(generatedLink);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    if (isLoading) {
        return <Loader2 className="h-8 w-8 animate-spin mx-auto" />;
    }

    return (
        <div className="space-y-4">
            <h3 className="font-semibold">Generate Enterprise Contract for: {account.organization_name}</h3>
            
            <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                    <Label htmlFor="price">Monthly Price ($)</Label>
                    <Input id="price" type="number" value={customPrice} onChange={e => setCustomPrice(e.target.value)} />
                </div>
                <div className="space-y-1">
                    <Label htmlFor="members">Member Limit</Label>
                    <Input id="members" type="number" value={customMemberLimit} onChange={e => setCustomMemberLimit(e.target.value)} />
                </div>
                <div className="space-y-1">
                    <Label htmlFor="term">Term (Months)</Label>
                    <Input id="term" type="number" value={contractTerm} onChange={e => setContractTerm(e.target.value)} />
                </div>
            </div>

            <div className="space-y-1">
                <Label>Master Service Agreement Preview (Read-only)</Label>
                <Textarea value={msaTemplate} readOnly rows={8} className="text-xs bg-gray-50" />
                <p className="text-xs text-red-600">Reminder: This template requires review by a legal professional.</p>
            </div>

            {generatedLink ? (
                <div className="space-y-2">
                    <Label>Generated Checkout Link</Label>
                    <div className="flex gap-2">
                        <Input value={generatedLink} readOnly />
                        <Button variant="outline" size="icon" onClick={handleCopy}>
                            {isCopied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                        </Button>
                    </div>
                    <p className="text-xs text-gray-500">Send this secure link to the customer to sign and pay.</p>
                </div>
            ) : (
                 <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
                    <Button onClick={handleGenerateLink} disabled={isGenerating}>
                        {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Generate Secure Link'}
                    </Button>
                </div>
            )}
        </div>
    );
}