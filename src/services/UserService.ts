import { api, client, hasError } from '@/adapter';

import store from '@/store';

const login = async (username: string, password: string): Promise<any> => {
  return api({
    url: "login",
    method: "post",
    data: {
      'USERNAME': username,
      'PASSWORD': password
    }
  });
}

const getUserProfile = async (token: any): Promise<any> => {
  const baseURL = store.getters['user/getBaseUrl'];
  try {
    const resp = await client({
      url: "user-profile",
      method: "get",
      baseURL,
      headers: {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/json'
      }
    });
    if (hasError(resp)) return Promise.reject("Error getting user profile: " + JSON.stringify(resp.data));
    return Promise.resolve(resp.data)
  } catch (error: any) {
    return Promise.reject(error)
  }
}

const getAvailableTimeZones = async (): Promise<any> => {
  return api({
    url: "getAvailableTimeZones",
    method: "get",
    cache: true
  });
}

const fetchUsers = async (payload: any): Promise<any> => {
  return api({
    url: "performFind",
    method: "post",
    data: payload
  })
}

const setUserTimeZone = async (payload: any): Promise<any> => {
  return api({
    url: "setUserTimeZone",
    method: "post",
    data: payload
  });
}

const getUserPermissions = async (payload: any, token: any): Promise<any> => {
  const baseURL = store.getters['user/getBaseUrl'];
  let serverPermissions = [] as any;

  // If the server specific permission list doesn't exist, getting server permissions will be of no use
  // It means there are no rules yet depending upon the server permissions.
  if (payload.permissionIds && payload.permissionIds.length == 0) return serverPermissions;
  // TODO pass specific permissionIds
  let resp;
  // TODO Make it configurable from the environment variables.
  // Though this might not be an server specific configuration, 
  // we will be adding it to environment variable for easy configuration at app level
  const viewSize = 200;

  try {
    const params = {
      "viewIndex": 0,
      viewSize,
      permissionIds: payload.permissionIds
    }
    resp = await client({
      url: "getPermissions",
      method: "post",
      baseURL,
      data: params,
      headers: {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/json'
      }
    })
    if (resp.status === 200 && resp.data.docs?.length && !hasError(resp)) {
      serverPermissions = resp.data.docs.map((permission: any) => permission.permissionId);
      const total = resp.data.count;
      const remainingPermissions = total - serverPermissions.length;
      if (remainingPermissions > 0) {
        // We need to get all the remaining permissions
        const apiCallsNeeded = Math.floor(remainingPermissions / viewSize) + (remainingPermissions % viewSize != 0 ? 1 : 0);
        const responses = await Promise.all([...Array(apiCallsNeeded).keys()].map(async (index: any) => {
          const response = await client({
            url: "getPermissions",
            method: "post",
            baseURL,
            data: {
              "viewIndex": index + 1,
              viewSize,
              permissionIds: payload.permissionIds
            },
            headers: {
              Authorization: 'Bearer ' + token,
              'Content-Type': 'application/json'
            }
          })
          if (!hasError(response)) {
            return Promise.resolve(response);
          } else {
            return Promise.reject(response);
          }
        }))
        const permissionResponses = {
          success: [],
          failed: []
        }
        responses.reduce((permissionResponses: any, permissionResponse: any) => {
          if (permissionResponse.status !== 200 || hasError(permissionResponse) || !permissionResponse.data?.docs) {
            permissionResponses.failed.push(permissionResponse);
          } else {
            permissionResponses.success.push(permissionResponse);
          }
          return permissionResponses;
        }, permissionResponses)

        serverPermissions = permissionResponses.success.reduce((serverPermissions: any, response: any) => {
          serverPermissions.push(...response.data.docs.map((permission: any) => permission.permissionId));
          return serverPermissions;
        }, serverPermissions)

        // If partial permissions are received and we still allow user to login, some of the functionality might not work related to the permissions missed.
        // Show toast to user intimiting about the failure
        // Allow user to login
        // TODO Implement Retry or improve experience with show in progress icon and allowing login only if all the data related to user profile is fetched.
        if (permissionResponses.failed.length > 0) Promise.reject("Something went wrong while getting complete user permissions.");
      }
    }
    return serverPermissions;
  } catch (error: any) {
    return Promise.reject(error);
  }
}

const getUserLoginDetails = async (payload: any): Promise<any> => {
  return api({
    url: 'performFind',
    method: 'POST',
    data: payload
  })
}

const getUserContactDetails = async (payload: any): Promise<any> => {
  return api({
    url: 'performFind',
    method: 'POST',
    data: payload
  })
}

const resetPassword = async (payload: any): Promise <any> => {
  return api({
    url: "service/resetPassword", 
    method: "post",
    data: payload
  });
}

const updateUserLoginStatus = async (payload: any): Promise <any> => {
  return api({
    url: "service/updateUserLoginStatus", 
    method: "post",
    data: payload
  });
}

const createUpdatePartyEmailAddress = async (payload: any): Promise <any> => {
  return api({
    url: "service/createUpdatePartyEmailAddress", 
    method: "post",
    data: payload
  });
}

const createUpdatePartyTelecomNumber = async (payload: any): Promise <any> => {
  return api({
    url: "service/createUpdatePartyTelecomNumber", 
    method: "post",
    data: payload
  });
}

const deletePartyContactMech = async (payload: any): Promise <any> => {
  return api({
    url: "service/deletePartyContactMech", 
    method: "post",
    data: payload
  });
}

const updatePartyGroup = async (payload: any): Promise <any> => {
  return api({
    url: "service/updatePartyGroup", 
    method: "post",
    data: payload
  });
}

const updatePerson = async (payload: any): Promise <any> => {
  return api({
    url: "service/updatePerson", 
    method: "post",
    data: payload
  });
} 

export const UserService = {
  createUpdatePartyEmailAddress,
  createUpdatePartyTelecomNumber,
  deletePartyContactMech,
  getAvailableTimeZones,
  fetchUsers,
  getUserContactDetails,
  getUserLoginDetails,
  getUserPermissions,
  getUserProfile,
  login,
  resetPassword,
  setUserTimeZone,
  updateUserLoginStatus,
  updatePartyGroup,
  updatePerson
}
