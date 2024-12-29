import React, { useEffect, useMemo, useState } from "react";
import { useCurrentAccount } from "@/stores/account";
import { useNavigationBuilder, useTheme } from "@react-navigation/native";
import { StyleSheet, View, ScrollView, Platform, Image, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import TabItem from "./atoms/TabItem";

import Reanimated, { LinearTransition, useSharedValue } from "react-native-reanimated";
import MenuItem from "./atoms/MenuItem";
import AccountSwitcher from "@/components/Home/AccountSwitcher";
import ContextMenu from "@/components/Home/AccountSwitcherContextMenu";
import { NativeText } from "@/components/Global/NativeComponents";
import { defaultProfilePicture } from "@/utils/ui/default-profile-picture";
import { he } from "date-fns/locale";

const PapillonNavigatorMenu: React.FC<Omit<ReturnType<typeof useNavigationBuilder>, "NavigationContent">> = ({ state, descriptors, navigation }) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const account = useCurrentAccount((store) => store.account);

  const allTabs = useMemo(() => state.routes, [state.routes]);
  const tabs = account?.personalization.tabs
    ?.map((tab) => allTabs.find((route) => route.name === tab.name))
    .filter(Boolean) || allTabs;

  const [shouldOpenContextMenu, setShouldOpenContextMenu] = useState(false);

  return (
    <Reanimated.View
      style={[
        styles.menuBar,
        {
          backgroundColor: theme.colors.card,
          borderColor: theme.colors.border,
        },
        Platform.OS === "android" ? styles.menuBarAndroid : styles.menuBarIOS,
      ]}
    >
      <Reanimated.ScrollView
        style={[
          styles.menuBarContent,
          {
            backgroundColor: theme.colors.primary + "10",
            paddingTop: insets.top + 10,
            paddingHorizontal: 10,
          }
        ]}
        contentContainerStyle={{
          gap: 0,
        }}
      >
        <ContextMenu
          shouldOpenContextMenu={shouldOpenContextMenu}
          transparent={true}
          menuStyles={{
            position: "absolute",
            top: 40,
          }}
          style={[
            {
              paddingBottom: 4,
            }
          ]}
        >
          <Reanimated.View
            style={{
              paddingHorizontal: 12,
              paddingVertical: 8,
              gap: 12,
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <Image
              source={(account?.personalization.profilePictureB64 && account?.personalization.profilePictureB64.trim() !== "") ? { uri: account.personalization.profilePictureB64 } : account ? defaultProfilePicture(account.service, account?.identityProvider?.name || "") : undefined}
              style={{
                width: 24,
                height: 24,
                borderRadius: 20,
              }}
            />

            <Text
              style={{
                color: theme.colors.text,
                fontFamily: "semibold",
                fontSize: 16,
              }}
            >
              {account?.studentName ? (
                account.studentName?.first + (account.studentName.last)
              ) : "Mon compte"}
            </Text>
          </Reanimated.View>
        </ContextMenu>

        {tabs.map((route, index) => (
          <MenuItem
            key={route?.key}
            route={route}
            descriptor={route ? descriptors[route.key] : undefined}
            navigation={navigation}
            isFocused={route ? allTabs.indexOf(route) === state.index : false}
          />
        ))}
      </Reanimated.ScrollView>
    </Reanimated.View>
  );
};

const styles = StyleSheet.create({
  menuBar: {
    width: 320,
    maxWidth: "35%",
    borderRightWidth: 1,
  },
  menuBarContent: {
    flex: 1
  },
  menuBarAndroid: {
    elevation: 10,
  },
  menuBarIOS: {},
});

export default PapillonNavigatorMenu;