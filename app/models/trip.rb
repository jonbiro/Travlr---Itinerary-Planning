class Trip < ApplicationRecord
  has_many :trip_users, dependent: :destroy #this dependent: :destroy deletes the join table's trip connection
  has_many :users, through: :trip_users
  has_many :cities
  has_many :places, through: :cities
end
