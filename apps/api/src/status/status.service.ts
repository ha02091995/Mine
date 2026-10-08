import { Injectable } from '@nestjs/common';
import { StatusCurrent } from '@prisma/client';
import { ApiException } from '../common/http';
import { MembershipService } from '../pair/membership.service';
import { PrismaService } from '../prisma/prisma.module';

export interface StatusInput {
  batteryEnabled: boolean;
  batteryPercent?: number;
  locationEnabled: boolean;
  lat?: number;
  lng?: number;
}

@Injectable()
export class StatusService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly membership: MembershipService,
  ) {}

  async update(userId: string, input: StatusInput) {
    if (input.locationEnabled && process.env.LOCATION_SHARING !== 'true') {
      throw new ApiException(403, 'FEATURE_DISABLED', 'Location sharing is turned off');
    }
    if (input.locationEnabled && (input.lat === undefined || input.lng === undefined)) {
      throw new ApiException(400, 'VALIDATION_ERROR', 'A shared location needs coordinates');
    }
    const now = new Date();
    const data = {
      batteryEnabled: input.batteryEnabled,
      batteryPercent: input.batteryEnabled ? (input.batteryPercent ?? null) : null,
      locationEnabled: input.locationEnabled,
      lat: input.locationEnabled ? input.lat! : null,
      lng: input.locationEnabled ? input.lng! : null,
      locationAt: input.locationEnabled ? now : null,
    };
    const status = await this.prisma.$transaction((tx) =>
      tx.statusCurrent.upsert({
        where: { userId },
        create: { userId, ...data },
        update: data,
      }),
    );
    return this.ownView(status);
  }

  async partner(userId: string, partnerId: string) {
    const member = await this.membership.findActive(userId);
    if (!member) throw new ApiException(404, 'PARTNERSHIP_NOT_FOUND', 'You are not in a partnership');
    const partner = await this.prisma.partnershipMember.findFirst({
      where: { partnershipId: member.partnershipId, userId: partnerId, status: 'active' },
    });
    if (!partner || partnerId === userId) {
      throw new ApiException(403, 'NOT_A_MEMBER', 'That person is not your partner');
    }
    const status = await this.prisma.statusCurrent.findUnique({ where: { userId: partnerId } });
    return this.sharedView(status);
  }

  async weather(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const status = await this.prisma.statusCurrent.findUnique({ where: { userId } });
    if (status?.locationEnabled && status.lat !== null && status.lng !== null) {
      return { source: 'point', city: user.city, temperatureC: Math.round(status.lat) % 35 };
    }
    if (user.city) {
      return { source: 'city', city: user.city, temperatureC: user.city.length % 35 };
    }
    throw new ApiException(404, 'WEATHER_UNAVAILABLE', 'Set a city or share a location');
  }

  private ownView(status: StatusCurrent) {
    return this.sharedView(status);
  }

  private sharedView(status: StatusCurrent | null) {
    const batteryOn = status?.batteryEnabled ?? false;
    const locationOn = status?.locationEnabled ?? false;
    return {
      battery: batteryOn ? { enabled: true, percent: status?.batteryPercent ?? null } : { enabled: false },
      location: locationOn
        ? { enabled: true, lat: status?.lat, lng: status?.lng, locationAt: status?.locationAt?.toISOString() ?? null }
        : { enabled: false },
    };
  }
}
