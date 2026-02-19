import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NavigationProp } from '@react-navigation/native';

export type RootTabParamList = {
  Map: undefined;
  Profile: undefined;
  Monitor: undefined;
};

export type RootTabNavigationProp = BottomTabNavigationProp<RootTabParamList>;

export type AppNavigationProp = NavigationProp<RootTabParamList>;

export interface TabIconProps {
  focused: boolean;
  icon: string;
  label: string;
}
