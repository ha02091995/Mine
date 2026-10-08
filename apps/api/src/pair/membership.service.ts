import { Injectable } from '@nestjs/common';
import { PartnershipMember } from '@prisma/client';
import { ApiException } from '../common/http';
import { PrismaService } from '../prisma/prisma.module';

@Injectable()
export class MembershipService {
  constructor(private readonly prisma: PrismaService) {}

  async findActive(userId: string) {
    return this.prisma.partnershipMember.findFirst({
      where: { userId, status: 'active', partnership: { status: 'active' } },
      include: {
        partnership: true,
        user: true,
      },
    });
  }

  async requireActive(userId: string, partnershipId: string): Promise<PartnershipMember> {
    const member = await this.prisma.partnershipMember.findFirst({
      where: {
        userId,
        partnershipId,
        status: 'active',
        partnership: { status: 'active' },
      },
    });
    if (!member) {
      throw new ApiException(403, 'NOT_A_MEMBER', 'You are not an active member of this partnership');
    }
    return member;
  }
}
