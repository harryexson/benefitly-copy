import React, { useState, useEffect, useMemo } from 'react';
import { Member, OnboardingProgress, User, MemberTag, MemberTagAssignment, MemberActivity } from '@/entities/all';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PlusCircle, Search, CheckCircle, XCircle, Users, Tag, Activity } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import MembersTable from '../components/members/MembersTable';
import MemberForm from '../components/members/MemberForm';
import PendingMembersTable from '../components/members/PendingMembersTable';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import PageTooltip from '../components/onboarding/PageTooltip';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const generateMemberNumber = () => {
  const timestamp = Date.now().toString();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `MEM${timestamp.slice(-6)}${random}`;
};

export default function Members() {
  const [members, setMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('active');
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [onboardingProgress, setOnboardingProgress] = useState(null);
  const [showTooltip, setShowTooltip] = useState(false);

  // CRM features
  const [tags, setTags] = useState([]);
  const [selectedTag, setSelectedTag] = useState('all');
  const [memberDetails, setMemberDetails] = useState(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  const loadMembers = async () => {
    try {
      const currentUser = await User.me();
      setIsLoading(true);
      
      // Load onboarding progress
      if (currentUser.association_account_id) {
        const progressRecords = await OnboardingProgress.filter({ 
          association_account_id: currentUser.association_account_id 
        });
        if (progressRecords.length > 0) {
          const progress = progressRecords[0];
          setOnboardingProgress(progress);
          
          if (!progress.members_page_visited) {
            setShowTooltip(true);
            await OnboardingProgress.update(progress.id, { members_page_visited: true });
          }
        }
      }
      
      const [memberList, tagList] = await Promise.all([
        Member.list('-created_date'),
        MemberTag.list()
      ]);
      
      setMembers(memberList);
      setTags(tagList);
      setIsLoading(false);
    } catch(e) {
      if (e.name === 'CanceledError' || (e.message && e.message.includes('aborted'))) {
        console.log('Data fetch for Members page aborted.');
      } else {
        console.error("Not authenticated, cannot load members.");
      }
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMembers();
  }, []);

  const handleOpenForm = (member = null) => {
    setEditingMember(member);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setEditingMember(null);
    setIsFormOpen(false);
  };

  const handleSave = async () => {
    await loadMembers();
    handleCloseForm();
    
    if (onboardingProgress && !onboardingProgress.first_member_added) {
      const allMembers = await Member.list();
      if (allMembers.length > 0) {
        await OnboardingProgress.update(onboardingProgress.id, { first_member_added: true });
      }
    }
  };

  const handleDelete = async (memberId) => {
    await Member.delete(memberId);
    await loadMembers();
    toast.success('Member deleted successfully');
  };

  const handleApproveMember = async (memberId) => {
    try {
      const member = members.find(m => m.id === memberId);
      if (!member) return;

      const memberNumber = member.member_number || generateMemberNumber();
      
      await Member.update(memberId, {
        status: 'Active',
        member_number: memberNumber,
        joined_at: new Date().toISOString().split('T')[0]
      });
      
      await loadMembers();
      toast.success('Member approved and activated successfully');
    } catch (error) {
      toast.error('Failed to approve member');
      console.error(error);
    }
  };

  const handleRejectMember = async (memberId) => {
    try {
      await Member.update(memberId, {
        status: 'Removed'
      });
      await loadMembers();
      toast.success('Member application rejected');
    } catch (error) {
      toast.error('Failed to reject member');
      console.error(error);
    }
  };

  const handleBulkApprove = async () => {
    if (selectedMembers.length === 0) {
      toast.warning('Please select members to approve');
      return;
    }

    setIsProcessing(true);
    try {
      const promises = selectedMembers.map(async (memberId) => {
        const member = members.find(m => m.id === memberId);
        if (!member) return;

        const memberNumber = member.member_number || generateMemberNumber();
        
        return Member.update(memberId, {
          status: 'Active',
          member_number: memberNumber,
          joined_at: new Date().toISOString().split('T')[0]
        });
      });

      await Promise.all(promises);
      setSelectedMembers([]);
      await loadMembers();
      toast.success(`${selectedMembers.length} members approved successfully`);
    } catch (error) {
      toast.error('Failed to approve some members');
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkReject = async () => {
    if (selectedMembers.length === 0) {
      toast.warning('Please select members to reject');
      return;
    }

    setIsProcessing(true);
    try {
      const promises = selectedMembers.map(memberId => 
        Member.update(memberId, { status: 'Removed' })
      );

      await Promise.all(promises);
      setSelectedMembers([]);
      await loadMembers();
      toast.success(`${selectedMembers.length} member applications rejected`);
    } catch (error) {
      toast.error('Failed to reject some members');
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleViewMemberDetails = async (member) => {
    try {
      const [tagAssignments, activities] = await Promise.all([
        MemberTagAssignment.filter({ member_id: member.id }),
        MemberActivity.filter({ member_id: member.id }, '-created_date', 20)
      ]);

      const memberTags = await Promise.all(
        tagAssignments.map(async (assignment) => {
          const tagList = await MemberTag.filter({ id: assignment.tag_id });
          return tagList[0];
        })
      );

      setMemberDetails({
        ...member,
        tags: memberTags.filter(t => t),
        activities: activities
      });
      setShowDetailsDialog(true);
    } catch (error) {
      console.error('Failed to load member details:', error);
      toast.error('Failed to load member details');
    }
  };

  const activeMembers = members.filter(m => m.status === 'Active' || m.status === 'Suspended');
  const pendingMembers = members.filter(m => m.status === 'Pending');
  
  const filteredActiveMembers = useMemo(() => {
    let filtered = activeMembers;

    // Filter by tag
    if (selectedTag !== 'all') {
      // This would require loading tag assignments for all members, which is expensive
      // For now, we'll just filter by search term
      filtered = activeMembers;
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(member =>
        `${member.first_name} ${member.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.member_number?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return filtered;
  }, [activeMembers, searchTerm, selectedTag]);

  const filteredPendingMembers = useMemo(() => {
    if (!searchTerm) return pendingMembers;
    return pendingMembers.filter(member =>
      `${member.first_name} ${member.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [pendingMembers, searchTerm]);

  // Calculate engagement stats
  const engagementStats = useMemo(() => {
    const highEngagement = activeMembers.filter(m => (m.engagement_score || 0) >= 70).length;
    const mediumEngagement = activeMembers.filter(m => (m.engagement_score || 0) >= 40 && (m.engagement_score || 0) < 70).length;
    const lowEngagement = activeMembers.filter(m => (m.engagement_score || 0) < 40).length;

    return { highEngagement, mediumEngagement, lowEngagement };
  }, [activeMembers]);

  return (
    <div className="space-y-6">
      <PageTooltip
        isVisible={showTooltip}
        onDismiss={() => setShowTooltip(false)}
        title="👥 Welcome to Member Management"
        description="This is where you'll manage your association's member directory. Start by adding your first member using the 'Add Member' button above."
        actions={[
          {
            label: "Add My First Member",
            onClick: () => {
              setShowTooltip(false);
              handleOpenForm();
            }
          }
        ]}
      />

      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
           <h2 className="text-2xl font-bold tracking-tight">Member Management</h2>
           <p className="text-gray-500">Manage association members and approve new applications.</p>
        </div>
        <Button onClick={() => handleOpenForm()} className="flex items-center gap-2">
          <PlusCircle className="h-5 w-5" />
          Add Member
        </Button>
      </div>

      {/* Engagement Stats */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Total Members</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeMembers.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">High Engagement</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{engagementStats.highEngagement}</div>
            <p className="text-xs text-gray-500">Score 70+</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Medium Engagement</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{engagementStats.mediumEngagement}</div>
            <p className="text-xs text-gray-500">Score 40-69</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Low Engagement</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{engagementStats.lowEngagement}</div>
            <p className="text-xs text-gray-500">Score 0-39</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList>
          <TabsTrigger value="active">
            Active Members ({activeMembers.length})
          </TabsTrigger>
          <TabsTrigger value="pending">
            <div className="flex items-center gap-2">
              Pending Approval ({pendingMembers.length})
              {pendingMembers.length > 0 && (
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
              )}
            </div>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search active members..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            {tags.length > 0 && (
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-gray-500" />
                <div className="flex gap-1">
                  <Badge 
                    variant={selectedTag === 'all' ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => setSelectedTag('all')}
                  >
                    All
                  </Badge>
                  {tags.slice(0, 5).map(tag => (
                    <Badge 
                      key={tag.id}
                      variant={selectedTag === tag.id ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => setSelectedTag(tag.id)}
                      style={{ 
                        backgroundColor: selectedTag === tag.id ? tag.color : 'transparent',
                        borderColor: tag.color,
                        color: selectedTag === tag.id ? 'white' : tag.color
                      }}
                    >
                      {tag.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          {isLoading ? (
            <div className="border rounded-lg p-4">
                <Skeleton className="h-8 w-1/4 mb-4" />
                <Skeleton className="h-10 w-full mb-2" />
                <Skeleton className="h-10 w-full mb-2" />
                <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <MembersTable
              members={filteredActiveMembers}
              onEdit={handleOpenForm}
              onDelete={handleDelete}
              onViewDetails={handleViewMemberDetails}
            />
          )}
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          {pendingMembers.length > 0 && (
            <Alert>
              <Users className="h-4 w-4" />
              <AlertDescription>
                You have {pendingMembers.length} pending member application(s) that require review and approval.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search pending members..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            {selectedMembers.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">
                  {selectedMembers.length} selected
                </span>
                <Button 
                  onClick={handleBulkApprove}
                  disabled={isProcessing}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve Selected
                </Button>
                <Button 
                  onClick={handleBulkReject}
                  disabled={isProcessing}
                  variant="destructive"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject Selected
                </Button>
              </div>
            )}
          </div>

          {isLoading ? (
            <div className="border rounded-lg p-4">
                <Skeleton className="h-8 w-1/4 mb-4" />
                <Skeleton className="h-10 w-full mb-2" />
                <Skeleton className="h-10 w-full mb-2" />
                <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <PendingMembersTable
              members={filteredPendingMembers}
              selectedMembers={selectedMembers}
              onSelectionChange={setSelectedMembers}
              onApprove={handleApproveMember}
              onReject={handleRejectMember}
              onEdit={handleOpenForm}
            />
          )}
        </TabsContent>
      </Tabs>

      {/* Member Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingMember ? 'Edit Member' : 'Add New Member'}</DialogTitle>
            <DialogDescription>
              {editingMember ? 'Update the details for this member.' : 'Fill in the details for the new member.'}
            </DialogDescription>
          </DialogHeader>
          <MemberForm
            member={editingMember}
            onSave={handleSave}
            onCancel={handleCloseForm}
          />
        </DialogContent>
      </Dialog>

      {/* Member Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Member Profile</DialogTitle>
          </DialogHeader>
          {memberDetails && (
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-lg mb-2">
                  {memberDetails.first_name} {memberDetails.last_name}
                </h3>
                <p className="text-sm text-gray-600">{memberDetails.email}</p>
                <p className="text-sm text-gray-600">Member #{memberDetails.member_number}</p>
                <div className="mt-2">
                  <Badge className="bg-blue-100 text-blue-800">
                    Engagement Score: {memberDetails.engagement_score || 0}
                  </Badge>
                </div>
              </div>

              {memberDetails.tags && memberDetails.tags.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Tag className="h-4 w-4" />
                    Tags
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {memberDetails.tags.map(tag => (
                      <Badge 
                        key={tag.id}
                        style={{ backgroundColor: tag.color, color: 'white' }}
                      >
                        {tag.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Recent Activity
                </h4>
                {memberDetails.activities && memberDetails.activities.length > 0 ? (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {memberDetails.activities.map(activity => (
                      <div key={activity.id} className="text-sm p-2 bg-gray-50 rounded">
                        <span className="font-medium">{activity.activity_type}:</span>{' '}
                        <span className="text-gray-600">{activity.activity_description}</span>
                        <div className="text-xs text-gray-500 mt-1">
                          {new Date(activity.created_date).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No recent activity</p>
                )}
              </div>

              {memberDetails.bio && (
                <div>
                  <h4 className="font-semibold mb-2">Bio</h4>
                  <p className="text-sm text-gray-600">{memberDetails.bio}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}